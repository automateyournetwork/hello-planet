import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import config from '../globe.config.json' with {type:'json'};
import { createRegionLookup } from './geolocation.mjs';

// Local review collector. No IP addresses, user agents, query strings or raw
// referrers are read into the database. Production deployment is deliberately gated.
export function createTrafficStore(filename, clock=()=>Date.now()) {
 if(!Number.isSafeInteger(config.baselineViews)||config.baselineViews<0)throw Error('baselineViews must be a nonnegative safe integer');
 new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone}).format();
 fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
 const db=new DatabaseSync(filename);fs.chmodSync(filename,0o600);
 db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS views(event TEXT PRIMARY KEY, session TEXT NOT NULL, day TEXT NOT NULL, path TEXT NOT NULL, created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS presence(session TEXT PRIMARY KEY, last_seen INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS views_day ON views(day);`);
 if(!db.prepare('PRAGMA table_info(presence)').all().some(c=>c.name==='page'))db.exec("ALTER TABLE presence ADD COLUMN page TEXT NOT NULL DEFAULT ''");
 for(const table of ['views','presence'])if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name==='region'))db.exec(`ALTER TABLE ${table} ADD COLUMN region TEXT`);
 const regionJSON=region=>region&&typeof region.code==='string'&&region.code.length<=40&&typeof region.name==='string'&&region.name.length<=100&&Number.isFinite(region.lat)&&Math.abs(region.lat)<=90&&Number.isFinite(region.lon)&&Math.abs(region.lon)<=180?JSON.stringify({code:region.code,name:region.name,lat:region.lat,lon:region.lon,...(region.level==='city'?{level:'city'}:{})}):null;
 db.exec('CREATE TABLE IF NOT EXISTS counter_baseline(id INTEGER PRIMARY KEY CHECK(id=1), views INTEGER NOT NULL, through TEXT NOT NULL)');
 db.prepare('INSERT OR IGNORE INTO counter_baseline VALUES(1,?,?)').run(config.baselineViews,config.baselineThrough);
 const baseline=db.prepare('SELECT views FROM counter_baseline WHERE id=1').get().views;
 const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone}).format(new Date(clock()));
 const sessionHash=id=>createHash('sha256').update(day()+':'+id).digest('hex');
 return {
  record(body,region=null) {
   if(!body||!/^[a-zA-Z0-9-]{16,80}$/.test(body.session||'')||!/^[a-zA-Z0-9-]{16,80}$/.test(body.page||'')||!['view','heartbeat','leave'].includes(body.type))throw Error('Invalid event');
   const id=sessionHash(body.session),now=clock();
   if(body.type==='leave'){db.prepare('DELETE FROM presence WHERE session=? AND page=?').run(id,body.page);return;}
   if(body.type==='view'){
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(body.event||'')||typeof body.path!=='string'||!body.path.startsWith('/')||body.path.startsWith('//')||body.path.length>500||/[?#\x00-\x20]/.test(body.path))throw Error('Invalid page');
    const minute=db.prepare('SELECT count(*) n FROM views WHERE session=? AND created>?').get(id,now-60000).n;if(minute>=30)throw Error('Rate limited');
    db.prepare('INSERT OR IGNORE INTO views(event,session,day,path,created,region) VALUES(?,?,?,?,?,?)').run(body.event,id,day(),body.path,now,regionJSON(region));
   }
   db.prepare('INSERT INTO presence(session,last_seen,page,region) VALUES(?,?,?,?) ON CONFLICT(session) DO UPDATE SET last_seen=excluded.last_seen,page=excluded.page,region=excluded.region').run(id,now,body.page,regionJSON(region));
   db.prepare('DELETE FROM presence WHERE last_seen<?').run(now-120000);
  },
  snapshot() {
   const now=clock();return {source:'local-preview',baselineViews:baseline,lifetimeViews:baseline+db.prepare('SELECT count(*) n FROM views').get().n,updatedAt:new Date(now).toISOString(),timezone:config.timezone,active:db.prepare('SELECT count(*) n FROM presence WHERE last_seen>?').get(now-90000).n,todayViews:db.prepare('SELECT count(*) n FROM views WHERE day=?').get(day()).n,todayVisitors:db.prepare('SELECT count(DISTINCT session) n FROM views WHERE day=?').get(day()).n,totalViews:db.prepare('SELECT count(*) n FROM views').get().n,locations:db.prepare('SELECT region,count(*) value FROM presence WHERE last_seen>? AND region IS NOT NULL GROUP BY region').all(now-90000).map(r=>({...JSON.parse(r.region),value:r.value})),todayLocations:db.prepare('SELECT region,count(*) value FROM views WHERE day=? AND region IS NOT NULL GROUP BY region').all(day()).map(r=>({...JSON.parse(r.region),value:r.value})),locationStatus:'Approximate city estimates where available, otherwise state/province representative points; local and unresolved addresses remain unmapped.',daily:db.prepare('SELECT day date,count(*) views,count(DISTINCT session) visitors FROM views GROUP BY day ORDER BY day').all()};
  },
  close(){db.close();},
 };
}
export function createTrafficHandler(store,geo={status:'unavailable',lookup:()=>null}){return async(req,res)=>{
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 if(req.method==='GET'){const locate=req.headers['x-ayn-viewer']==='1'&&req.headers.dnt!=='1'&&req.headers['sec-gpc']!=='1';return send(200,{...store.snapshot(),geolocation:geo.status,viewerLocation:locate?geo.lookup(req.socket.remoteAddress):null});}
 if(req.method!=='POST')return send(405,{error:'Method not allowed'});
 let sameOrigin=false;try{sameOrigin=!!req.headers.origin&&new URL(req.headers.origin).host===req.headers.host;}catch{}
 if(!sameOrigin)return send(403,{error:'Same-origin requests only'});
 if(!String(req.headers['content-type']).startsWith('application/json'))return send(415,{error:'JSON required'});
 if(req.headers.dnt==='1'||req.headers['sec-gpc']==='1')return send(200,{ignored:true});
 try{let text='';for await(const chunk of req){text+=chunk;if(text.length>2048)return send(413,{error:'Body too large'});}const body=JSON.parse(text);store.record(body,body?.type==='leave'?null:geo.lookup(req.socket.remoteAddress));send(200,{ok:true});}catch{send(400,{error:'Invalid event'});}
};}
export function trafficPlugin(){let store;return {name:'ayn-local-traffic',configureServer:attach};async function attach(server){if(process.env.AYN_LOCAL_ANALYTICS==='0')return;const geo=await createRegionLookup();store??=createTrafficStore(path.resolve('private/analytics/local-preview.sqlite'));server.httpServer?.once('close',()=>store?.close());server.middlewares.use('/api/traffic',createTrafficHandler(store,geo));}}
