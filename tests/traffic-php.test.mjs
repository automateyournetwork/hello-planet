import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';

const php=process.env.PHP_BIN||'php';
async function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ayn-php-test-'));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const root=path.join(directory,'public');fs.mkdirSync(root);fs.copyFileSync('server/php/traffic.php',path.join(root,'traffic.php'));
 const child=spawn(php,['-S',`127.0.0.1:${port}`,'-t',root],{env:{...process.env,AYN_ANALYTICS_DIR:path.join(directory,'private')},stdio:['ignore','ignore','pipe']});
 let error='';child.stderr.on('data',d=>error+=d);child.on('error',e=>error+=e.message);
 const origin=`http://127.0.0.1:${port}`,url=origin+'/traffic.php';
 for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)break;throw Error(await r.text());}catch(e){if(i===99){child.kill();throw Error(`PHP fixture failed: ${error} ${e}`);}await new Promise(r=>setTimeout(r,25));}}
 const get=async(headers={})=>(await fetch(url,{headers})).json();
 const post=(body,headers={})=>fetch(url,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
 return {directory,child,get,post,url,close:async()=>{child.kill();await once(child,'exit');fs.rmSync(directory,{recursive:true,force:true});}};
}
const session='11111111-2222-3333-4444-555555555555',page='22222222-2222-3333-4444-555555555555';
const view={session,page,event:page,type:'view',path:'/'};

test('production PHP counts deduplicated real visits, retains presence and persists its baseline',async()=>{
 const f=await fixture();try{
  assert.equal((await f.get()).lifetimeViews,0);
  assert.equal((await f.post(view)).status,200);await f.post(view);
  let s=await f.get();assert.equal(s.totalViews,1);assert.equal(s.active,1);assert.equal(s.source,'production');assert.equal(s.lifetimeViews,1);assert.equal(s.todayVisitors,1);assert.deepEqual(s.locations,[]);
  const newer='33333333-2222-3333-4444-555555555555';await f.post({...view,page:newer,event:newer,path:'/pyats/'});
  await f.post({session,page,type:'leave'});assert.equal((await f.get()).active,1);
  await f.post({session,page:newer,type:'leave'});assert.equal((await f.get()).active,0);
  await f.post({session,page:newer,type:'heartbeat'});s=await f.get();assert.equal(s.active,1);assert.equal(s.totalViews,2);assert.equal(s.daily[0].views,2);
  const mode=fs.statSync(path.join(f.directory,'private/traffic.sqlite')).mode&0o777;assert.equal(mode,0o600);
  assert.ok(!JSON.stringify(s).includes(session));assert.ok(!JSON.stringify(s).includes('127.0.0.1'));
 }finally{await f.close();}
});
test('production PHP rejects forged origins, malformed events, oversized bodies and respects opt-outs',async()=>{
 const f=await fixture();try{
  assert.equal((await f.post(view,{origin:'https://evil.example'})).status,403);
  assert.equal((await f.post({...view,path:'/secret?token=abc'})).status,400);
  assert.equal((await f.post({...view,path:'//elsewhere'})).status,400);
  assert.equal((await f.post({...view,session:'bad'})).status,400);
  assert.equal((await f.post({...view,extra:'x'.repeat(3000)})).status,413);
  assert.equal((await f.post(view,{'content-type':'text/plain'})).status,415);
  assert.deepEqual(await (await f.post(view,{dnt:'1'})).json(),{ignored:true});
  assert.deepEqual(await (await f.post(view,{'sec-gpc':'1'})).json(),{ignored:true});
  assert.equal((await f.get()).totalViews,0);
  await f.post({...view,region:{lat:40,lon:-74,name:'spoof'},ip:'8.8.8.8'});assert.deepEqual((await f.get()).locations,[]);
  assert.equal((await fetch(f.url,{method:'DELETE'})).status,405);
 }finally{await f.close();}
});
test('production PHP serializes simultaneous view writes without losing counts',async()=>{
 const f=await fixture();try{
  const results=await Promise.all(Array.from({length:20},(_,i)=>{const id=`44444444-2222-3333-4444-${String(i).padStart(12,'0')}`;return f.post({...view,event:id,page:id,session:id});}));
  assert.ok(results.every(r=>r.ok));const s=await f.get();assert.equal(s.totalViews,20);assert.equal(s.lifetimeViews,78393);assert.equal(s.active,20);
 }finally{await f.close();}
});
