import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createTrafficStore} from '../server/traffic.mjs';
function setup(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ayn-traffic-'));let now=Date.parse('2026-09-24T16:00:00Z');const store=createTrafficStore(path.join(dir,'events.sqlite'),()=>now);return {store,advance:n=>now+=n,close:()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});}};}
const session='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';const page='99999999-2222-3333-4444-555555555555';
test('view retries are idempotent; heartbeat does not add views; presence expires',()=>{const t=setup();try{const event={type:'view',session,page,event:'11111111-2222-3333-4444-555555555555',path:'/stats/'};t.store.record(event);t.store.record(event);t.store.record({type:'heartbeat',session,page});assert.equal(t.store.snapshot().todayViews,1);assert.equal(t.store.snapshot().active,1);t.advance(91000);assert.equal(t.store.snapshot().active,0);assert.equal(t.store.snapshot().todayViews,1);}finally{t.close();}});
test('query strings, external paths and invalid sessions are rejected',()=>{const t=setup();try{for(const route of ['https://example.org/','//example.org/','/login/?token=secret','/path#fragment'])assert.throws(()=>t.store.record({type:'view',session,page,event:'11111111-2222-3333-4444-555555555555',path:route}));assert.throws(()=>t.store.record({type:'heartbeat',session:'bad'}));assert.equal(t.store.snapshot().totalViews,0);}finally{t.close();}});
test('today follows Toronto time and visitors are not added across days',()=>{const t=setup();try{t.store.record({type:'view',session,page,event:'11111111-2222-3333-4444-555555555555',path:'/'});t.advance(24*60*60*1000);t.store.record({type:'view',session,page,event:'22222222-2222-3333-4444-555555555555',path:'/'});const s=t.store.snapshot();assert.equal(s.todayViews,1);assert.equal(s.todayVisitors,1);assert.equal(s.totalViews,2);assert.equal(s.daily.length,2);assert.equal(s.locations.length,0);assert.equal(JSON.stringify(s).includes(session),false);}finally{t.close();}});
test('leaving removes active presence but preserves the page view',()=>{const t=setup();try{t.store.record({type:'view',session,page,event:'11111111-2222-3333-4444-555555555555',path:'/'});t.store.record({type:'leave',session,page});assert.equal(t.store.snapshot().active,0);assert.equal(t.store.snapshot().totalViews,1);}finally{t.close();}});

test('late leave from previous page does not erase current presence',()=>{const t=setup();try{t.store.record({type:'view',session,page,event:page,path:'/'});const newer='88888888-2222-3333-4444-555555555555';t.store.record({type:'view',session,page:newer,event:newer,path:'/stats/'});t.store.record({type:'leave',session,page});assert.equal(t.store.snapshot().active,1);}finally{t.close();}});

test('regional pins distinguish active sessions from today views and ignore client location fields',()=>{
 const t=setup();try{
  const region={code:'CA-QC',name:'Québec, CA',lat:52,lon:-73};
  t.store.record({type:'view',session,page,event:page,path:'/',ip:'never-store-me',region:{name:'client spoof'}},region);
  t.store.record({type:'view',session,page,event:'88888888-2222-3333-4444-555555555555',path:'/stats/'},region);
  const s=t.store.snapshot();assert.equal(s.locations[0].value,1);assert.equal(s.todayLocations[0].value,2);assert.equal(JSON.stringify(s).includes('never-store-me'),false);assert.equal(JSON.stringify(s).includes('client spoof'),false);
  t.advance(91000);assert.equal(t.store.snapshot().locations.length,0);assert.equal(t.store.snapshot().todayLocations[0].value,2);
 }finally{t.close();}
});

test('0 historical baseline and new views survive a database restart without double counting',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ayn-lifetime-')),file=path.join(dir,'events.sqlite');let store=createTrafficStore(file);
 try{const event={type:'view',session,page,event:page,path:'/'};assert.equal(store.snapshot().baselineViews,0);store.record(event);assert.equal(store.snapshot().lifetimeViews,1);store.close();store=createTrafficStore(file);store.record(event);assert.equal(store.snapshot().lifetimeViews,1);assert.equal(store.snapshot().totalViews,1);}finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('viewer lookup is opt-in, respects privacy, ignores forwarded IPs and never records a visit',async()=>{
 const {createServer}=await import('node:http');const {once}=await import('node:events');const {createTrafficHandler}=await import('../server/traffic.mjs');
 const t=setup(),lookups=[],region={code:'US-CA',name:'California, US',lat:36.75,lon:-119.59};
 const server=createServer(createTrafficHandler(t.store,{status:'available',lookup:ip=>{lookups.push(ip);return region;}}));server.listen(0,'127.0.0.1');await once(server,'listening');
 try{const url=`http://127.0.0.1:${server.address().port}/api/traffic`;
  for(const headers of [{},{'X-AYN-Viewer':'1',DNT:'1'},{'X-AYN-Viewer':'1','Sec-GPC':'1'}]){const res=await fetch(url,{headers});assert.equal((await res.json()).viewerLocation,null);assert.equal(res.headers.get('set-cookie'),null);}
  assert.equal(lookups.length,0);
  const res=await fetch(url,{headers:{'X-AYN-Viewer':'1','X-Forwarded-For':'8.8.8.8'}}),data=await res.json();assert.deepEqual(data.viewerLocation,region);assert.deepEqual(lookups,['127.0.0.1']);assert.equal(data.totalViews,0);assert.equal(data.active,0);assert.deepEqual(data.locations,[]);assert.equal(JSON.stringify(data).includes('127.0.0.1'),false);assert.equal(res.headers.get('cache-control'),'no-store');
 }finally{await new Promise(resolve=>server.close(resolve));t.close();}
});

test('city precision survives aggregation and distinct cities remain separate',()=>{
 const t=setup();try{
  const cities=[{code:'city:montreal',name:'Montreal, Quebec, CA',lat:45.5,lon:-73.6,level:'city'},{code:'city:quebec',name:'Quebec City, Quebec, CA',lat:46.8,lon:-71.2,level:'city'}];
  cities.forEach((city,i)=>t.store.record({type:'view',session:i?'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee':session,page,event:`${i+1}1111111-2222-3333-4444-555555555555`,path:'/'},city));
  const s=t.store.snapshot();assert.equal(s.locations.length,2);assert.equal(s.todayLocations.length,2);assert.equal(s.todayViews,2);for(const row of s.locations){assert.equal(row.level,'city');assert.equal(row.value,1);}
 }finally{t.close();}
});
