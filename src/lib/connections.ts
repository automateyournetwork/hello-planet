export type Coordinate={lat:number;lon:number};
// Minimum spanning tree guarantees connectivity; two nearest neighbours per
// point add local density without the visual clutter of a complete graph.
export function connectionPairs(points:Coordinate[]):[number,number][]{
 if(points.length<2)return [];
 const xyz=(p:Coordinate)=>{const a=p.lat*Math.PI/180,b=p.lon*Math.PI/180;return [Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a)];};
 const vectors=points.map(xyz),distance=(a:number,b:number)=>vectors[a].reduce((n,x,i)=>n+(x-vectors[b][i])**2,0);
 const edges=new Map<string,[number,number]>();const add=(a:number,b:number)=>{if(a>b)[a,b]=[b,a];edges.set(`${a}:${b}`,[a,b]);};
 const reached=new Set([0]);
 while(reached.size<points.length){let best=Infinity,pair:[number,number]=[0,0];for(const a of reached)for(let b=0;b<points.length;b++)if(!reached.has(b)){const d=distance(a,b);if(d<best){best=d;pair=[a,b];}}add(...pair);reached.add(pair[1]);}
 for(let a=0;a<points.length;a++)points.map((_,b)=>b).filter(b=>a!==b).sort((b,c)=>distance(a,b)-distance(a,c)).slice(0,2).forEach(b=>add(a,b));
 return [...edges.values()];
}
