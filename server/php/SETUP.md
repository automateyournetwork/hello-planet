# PHP collector integration notes

`traffic.php` is the production collector adapted for Hello, Planet. This folder does not deploy anything.

1. Provide PHP 8.1+ with PDO SQLite. Serve `traffic.php` at `/api/traffic.php`, with a same-origin rewrite from `/api/traffic` to that file.
2. Set `AYN_ANALYTICS_DIR` to a private directory outside the document root. The default is a sibling directory named `ayn-analytics`.
3. The collector creates `traffic.sqlite` and initializes `HELLO_PLANET_BASELINE` (default `0`) once. Set that environment variable before first use and plan any existing-database migration explicitly. Keep real databases outside static release directories.
4. Without an MMDB, counts work but location pins remain unavailable. For lookup, install the locked PHP reader with `composer install --working-dir=server/php --no-dev --classmap-authoritative`. Its configured vendor output is `private/production-analytics/vendor/` inside this extracted package.
5. Put that reader directory and your separately obtained DB-IP City MMDB, named `visitors.mmdb`, into the selected private analytics directory. Preserve any existing `traffic.sqlite`; do not overwrite it while updating the lookup database. Keep directories/files owner-restricted and retain DB-IP attribution.
6. Use `npm run test:php` for temporary-database collector tests. `PHP_BIN` can select a PHP executable with PDO SQLite.

Set `HELLO_PLANET_TIMEZONE` to the same IANA timezone as `globe.config.json` (default `America/Toronto`).

The PHP and Node databases are independent. The PHP version uses rounded city estimates or no location; the Node review collector also supports regional fallbacks. Both use the direct peer address rather than arbitrary forwarded headers. An external proxy requires a separately defined trusted-proxy integration.
