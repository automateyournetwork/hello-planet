import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import maxmind from 'maxmind';
import ipaddr from 'ipaddr.js';
import regions from './data/regions.json' with {type:'json'};
const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const byCode=new Map(regions.regions.map(r=>[r.code,r]));
const byName=new Map();for(const region of regions.regions)for(const name of [region.name,...region.aliases])byName.set(region.country+':'+normal(name),region);
export function toRegion(record){
 const country=record?.country?.iso_code,subdivision=record?.subdivisions?.[0];if(!country||!subdivision)return null;
 const candidate=(subdivision.iso_code?byCode.get(country+'-'+subdivision.iso_code):null)||byName.get(country+':'+normal(subdivision.names?.en));
 if(!candidate||candidate.country!==country)return null;
 // Deliberately discard IP database city, postal code and city coordinates.
 return {code:candidate.code,name:`${candidate.name}, ${country}`,lat:candidate.lat,lon:candidate.lon};
}
// City names are database estimates, never GPS. Only rounded city coordinates
// survive this boundary; street/postal data and the lookup IP are discarded.
export function toApproximateLocation(record){
 const region=toRegion(record);if(!region)return null;
 const city=record?.city?.names?.en,lat=record?.location?.latitude,lon=record?.location?.longitude;
 if(typeof city!=='string'||!city.trim()||city.length>70||/[\x00-\x1f]/.test(city)||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180)return region;
 const name=city.trim();const id=createHash('sha256').update(region.code+':'+normal(name)).digest('hex').slice(0,16);
 return {code:'city:'+id,name:`${name}, ${region.name}`.slice(0,100),lat:Math.round(lat*10)/10,lon:Math.round(lon*10)/10,level:'city'};
}
export function publicAddress(value){
 try{const address=ipaddr.process(value||'');return address.range()==='unicast'?address.toString():null;}catch{return null;}
}
export async function createRegionLookup(filename=process.env.AYN_GEOIP_DATABASE||path.resolve('private/geoip/dbip-city-lite-2026-09.mmdb')){
 if(!fs.existsSync(filename))return {status:'unavailable',lookup:()=>null};
 const db=await maxmind.open(filename);return {status:'db-ip-city-regions',lookup(address){const ip=publicAddress(address);if(!ip)return null;try{return toApproximateLocation(db.get(ip));}catch{return null;}}};
}
