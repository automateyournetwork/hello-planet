// Build the unprojected interior state mesh. No visitor data enters this file.
import fs from 'node:fs';
import {mesh} from 'topojson-client';
const source='https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json';
const response=await fetch(source);if(!response.ok)throw Error(`US Atlas: ${response.status}`);
const topology=await response.json();
const lines=mesh(topology,topology.objects.states,(a,b)=>a!==b).coordinates.map(line=>line.map(([lon,lat])=>[+lon.toFixed(4),+lat.toFixed(4)]));
fs.writeFileSync('public/data/us-state-borders.json',JSON.stringify({source,attribution:'US Census Bureau 2017 cartographic boundaries, via US Atlas 3.0.1 (ISC)',lines})+'\n');
console.log(`Prepared ${lines.length} interior US state boundary lines.`);
