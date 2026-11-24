import test from 'node:test';import assert from 'node:assert/strict';import {connectionPairs} from '../src/lib/connections.ts';
test('connections form one connected graph without duplicate or self edges',()=>{
 const points=[{lat:45,lon:-75},{lat:1,lon:103},{lat:51,lon:0},{lat:-33,lon:151},{lat:40,lon:-74},{lat:39,lon:-110},{lat:-23,lon:-46}];
 const edges=connectionPairs(points);assert.equal(new Set(edges.map(e=>e.join(':'))).size,edges.length);assert.ok(edges.every(([a,b])=>a!==b));
 const reached=new Set([0]);for(let i=0;i<points.length;i++)for(const [a,b] of edges)if(reached.has(a)||reached.has(b)){reached.add(a);reached.add(b);}assert.equal(reached.size,points.length);
 assert.deepEqual(connectionPairs([]),[]);assert.deepEqual(connectionPairs([points[0]]),[]);assert.deepEqual(connectionPairs(points.slice(0,2)),[[0,1]]);
});
