<?php
// First-party collector for the Apache/PHP host. Database and GeoIP files live
// outside the document root and survive static-site release swaps.
declare(strict_types=1);
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function query(PDO $db, string $sql, array $args = []): PDOStatement {
    $q = $db->prepare($sql); $q->execute($args); return $q;
}
function location(string $directory): ?array {
    // Only the direct peer is trusted. Never trust arbitrary forwarded headers.
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (str_starts_with($ip, '::ffff:')) $ip = substr($ip, 7);
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return null;
    if (!is_file($directory . '/vendor/autoload.php') || !is_file($directory . '/visitors.mmdb')) return null;
    try {
        require_once $directory . '/vendor/autoload.php';
        $reader = new \MaxMind\Db\Reader($directory . '/visitors.mmdb');
        $r = $reader->get($ip); $reader->close();
        $city = $r['city']['names']['en'] ?? null;
        $country = $r['country']['iso_code'] ?? null;
        $region = $r['subdivisions'][0]['names']['en'] ?? null;
        $lat = $r['location']['latitude'] ?? null; $lon = $r['location']['longitude'] ?? null;
        if (!$country || !$city || !is_numeric($lat) || !is_numeric($lon) || abs($lat) > 90 || abs($lon) > 180) return null;
        preg_match('/^.{0,100}/us', implode(', ',array_filter([$city,$region,$country])), $name);
        return ['code'=>'city:'.substr(hash('sha256', "$country:$region:$city"),0,16), 'name'=>$name[0], 'lat'=>round((float)$lat,1), 'lon'=>round((float)$lon,1), 'level'=>'city'];
    } catch (Throwable $e) { return null; }
}
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET','POST'], true)) respond(405, ['error'=>'Method not allowed']);
    $private = ($_SERVER['HTTP_DNT'] ?? '') === '1' || ($_SERVER['HTTP_SEC_GPC'] ?? '') === '1';
    $body = null;
    if ($method === 'POST') {
        $origin = parse_url($_SERVER['HTTP_ORIGIN'] ?? '');
        $expected = (($_SERVER['HTTPS'] ?? '') === 'on' ? 'https' : 'http').'://'.($_SERVER['HTTP_HOST'] ?? '');
        if (!$origin || !isset($origin['host']) || rtrim($_SERVER['HTTP_ORIGIN'] ?? '', '/') !== $expected) respond(403, ['error'=>'Same-origin requests only']);
        if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) respond(415, ['error'=>'JSON required']);
        if ($private) respond(200, ['ignored'=>true]);
        $raw = file_get_contents('php://input', false, null, 0, 2049);
        if (strlen($raw) > 2048) respond(413, ['error'=>'Body too large']);
        $body = json_decode($raw, true);
        $validId = fn($value) => is_string($value) && preg_match('/^[a-zA-Z0-9-]{16,80}$/D', $value);
        if (!is_array($body) || !$validId($body['session'] ?? null) || !$validId($body['page'] ?? null) || !in_array($body['type'] ?? '', ['view','heartbeat','leave'], true)) respond(400,['error'=>'Invalid event']);
        if ($body['type'] === 'view' && (!$validId($body['event'] ?? null) || !is_string($body['path'] ?? null) || !preg_match('~^/(?!/)[^?#\x00-\x20]{0,499}$~D',$body['path']))) respond(400,['error'=>'Invalid page']);
    }
    $configuredBaseline = filter_var(getenv('HELLO_PLANET_BASELINE') ?: '0', FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>9007199254740991]]);
    if ($configuredBaseline === false) throw new RuntimeException('Invalid baseline');
    umask(0077);
    $directory = getenv('AYN_ANALYTICS_DIR') ?: dirname($_SERVER['DOCUMENT_ROOT']).'/ayn-analytics';
    if (!is_dir($directory) && !mkdir($directory,0700,true)) throw new RuntimeException('Storage unavailable');
    $db = new PDO('sqlite:'.$directory.'/traffic.sqlite', null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS views(event TEXT PRIMARY KEY,session TEXT NOT NULL,day TEXT NOT NULL,path TEXT NOT NULL,created INTEGER NOT NULL,region TEXT); CREATE INDEX IF NOT EXISTS views_day ON views(day); CREATE INDEX IF NOT EXISTS views_session_created ON views(session,created); CREATE TABLE IF NOT EXISTS presence(session TEXT PRIMARY KEY,last_seen INTEGER NOT NULL,page TEXT NOT NULL,region TEXT); CREATE TABLE IF NOT EXISTS counter_baseline(id INTEGER PRIMARY KEY CHECK(id=1),views INTEGER NOT NULL);');
    // Build-time baseline; never copied from the local preview database.
    query($db,'INSERT OR IGNORE INTO counter_baseline VALUES(1,?)',[$configuredBaseline]);
    $now = time(); $day = (new DateTimeImmutable('now',new DateTimeZone((getenv('HELLO_PLANET_TIMEZONE') ?: 'America/Toronto'))))->format('Y-m-d');
    if ($method === 'POST') {
        $session = hash('sha256',$day.':'.$body['session']);
        if ($body['type'] === 'leave') query($db,'DELETE FROM presence WHERE session=? AND page=?',[$session,$body['page']]);
        else {
            $place = location($directory); $region = $place ? json_encode($place,JSON_THROW_ON_ERROR) : null;
            $db->exec('BEGIN IMMEDIATE');
            if ($body['type'] === 'view') {
                if ((int)query($db,'SELECT count(*) FROM views WHERE session=? AND created>?',[$session,$now-60])->fetchColumn() >= 30) { $db->exec('ROLLBACK'); respond(429,['error'=>'Rate limited']); }
                query($db,'INSERT OR IGNORE INTO views VALUES(?,?,?,?,?,?)',[$body['event'],$session,$day,$body['path'],$now,$region]);
            }
            query($db,'INSERT INTO presence VALUES(?,?,?,?) ON CONFLICT(session) DO UPDATE SET last_seen=excluded.last_seen,page=excluded.page,region=excluded.region',[$session,$now,$body['page'],$region]);
            query($db,'DELETE FROM presence WHERE last_seen<?',[$now-120]);
            $db->exec('COMMIT');
        }
        respond(200,['ok'=>true]);
    }
    // One read transaction keeps totals consistent while other visitors arrive.
    $db->beginTransaction();
    $total = (int)query($db,'SELECT count(*) FROM views')->fetchColumn();
    $baseline = (int)query($db,'SELECT views FROM counter_baseline WHERE id=1')->fetchColumn();
    $places = function(string $sql,array $args) use ($db): array { return array_map(fn($r)=>array_merge(json_decode($r['region'],true),['value'=>(int)$r['value']]),query($db,$sql,$args)->fetchAll()); };
    $result = ['source'=>'production','baselineViews'=>$baseline,'lifetimeViews'=>$baseline+$total,'totalViews'=>$total,'updatedAt'=>gmdate('c',$now),'timezone'=>(getenv('HELLO_PLANET_TIMEZONE') ?: 'America/Toronto'),
        'active'=>(int)query($db,'SELECT count(*) FROM presence WHERE last_seen>?',[$now-90])->fetchColumn(),
        'todayViews'=>(int)query($db,'SELECT count(*) FROM views WHERE day=?',[$day])->fetchColumn(),
        'todayVisitors'=>(int)query($db,'SELECT count(DISTINCT session) FROM views WHERE day=?',[$day])->fetchColumn(),
        'locations'=>$places('SELECT region,count(*) value FROM presence WHERE last_seen>? AND region IS NOT NULL GROUP BY region',[$now-90]),
        'todayLocations'=>$places('SELECT region,count(*) value FROM views WHERE day=? AND region IS NOT NULL GROUP BY region',[$day]),
        'daily'=>query($db,'SELECT day date,count(*) views,count(DISTINCT session) visitors FROM views GROUP BY day ORDER BY day')->fetchAll(),
        'geolocation'=>is_file($directory.'/visitors.mmdb')&&is_file($directory.'/vendor/autoload.php')?'db-ip-city':'unavailable',
        'viewerLocation'=>!$private&&($_SERVER['HTTP_X_AYN_VIEWER'] ?? '')==='1'?location($directory):null];
    $db->commit(); respond(200,$result);
} catch (Throwable $e) {
    // Do not return filesystem paths or database errors to a public client.
    respond(503,['error'=>'Visitor counter temporarily unavailable']);
}
