import test from 'node:test';import assert from 'node:assert/strict';
import {toRegion,publicAddress} from '../server/geolocation.mjs';
test('private, loopback, link-local, multicast and malformed addresses stay unmapped',()=>{
 for(const ip of ['127.0.0.1','::1','10.1.2.3','192.168.1.1','172.16.0.1','169.254.10.1','fc00::1','fe80::1','224.0.0.1','::ffff:127.0.0.1','100.64.0.1','bad'])assert.equal(publicAddress(ip),null,ip);
 assert.equal(publicAddress('::ffff:8.8.8.8'),'8.8.8.8');assert.equal(publicAddress('2001:4860:4860::8888'),'2001:4860:4860::8888');
});
test('IP database city and coordinates are replaced with a state representative point',()=>{
 const input={country:{iso_code:'CA'},subdivisions:[{iso_code:'QC',names:{en:'Quebec'}}],city:{names:{en:'A precise city'}},postal:{code:'private'},location:{latitude:45.5,longitude:-73.5}};
 const result=toRegion(input);assert.equal(result.code,'CA-QC');assert.equal(result.name,'Quebec, CA');assert.notEqual(result.lat,input.location.latitude);assert.deepEqual(Object.keys(result).sort(),['code','lat','lon','name']);
 assert.deepEqual(toRegion({...input,subdivisions:[{names:{en:'Quebec'}}]}),result);
 assert.equal(toRegion({country:{iso_code:'CA'},subdivisions:[{names:{en:'Unknown region'}}]}),null);
});

test('US state codes resolve independently from country codes without city coordinates',()=>{
 const state=(code)=>toRegion({country:{iso_code:'US'},subdivisions:[{iso_code:code}],city:{names:{en:'Do not retain'}},location:{latitude:1,longitude:2}});
 for(const [code,name] of [['CA','California'],['NY','New York'],['TX','Texas']]){const r=state(code);assert.equal(r.code,`US-${code}`);assert.equal(r.name,`${name}, US`);assert.deepEqual(Object.keys(r).sort(),['code','lat','lon','name']);assert.notEqual(r.lat,1);}
 assert.notDeepEqual(state('CA'),toRegion({country:{iso_code:'CA'},subdivisions:[{iso_code:'QC'}]}));
 assert.equal(state('XX'),null);
});

test('city estimates round coordinates, retain the subdivision and discard sensitive input fields',async()=>{
 const {toApproximateLocation}=await import('../server/geolocation.mjs');
 const fixture={country:{iso_code:'CA'},subdivisions:[{iso_code:'QC'}],city:{names:{en:'Montréal'}},location:{latitude:45.50884,longitude:-73.58781},postal:{code:'private'},traits:{isp:'Bell',ip_address:'private'}};
 const r=toApproximateLocation(fixture);assert.equal(r.level,'city');assert.equal(r.name,'Montréal, Quebec, CA');assert.equal(r.lat,45.5);assert.equal(r.lon,-73.6);assert.match(r.code,/^city:[a-f0-9]{16}$/);assert.deepEqual(Object.keys(r).sort(),['code','lat','level','lon','name']);
 assert.equal(toApproximateLocation({...fixture,city:{names:{en:'Montreal'}}}).code,r.code);
 assert.equal(toApproximateLocation({...fixture,subdivisions:[{iso_code:'ON'}]}).name,'Montréal, Ontario, CA'); // Preserve provider's region, never guess from carrier.
 for(const patch of [{city:null},{location:{latitude:NaN,longitude:0}},{location:{latitude:95,longitude:0}}])assert.deepEqual(toApproximateLocation({...fixture,...patch}),toRegion(fixture));
 assert.equal(toApproximateLocation({...fixture,subdivisions:[{iso_code:'XX'}]}),null);
});

test('Canadian provinces and territories resolve independently of ISP names',async()=>{
 const {toApproximateLocation}=await import('../server/geolocation.mjs');
 for(const code of ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']){
  const input={country:{iso_code:'CA'},subdivisions:[{iso_code:code}],traits:{isp:'Telus'}};assert.equal(toApproximateLocation(input).code,'CA-'+code);
 }
});
