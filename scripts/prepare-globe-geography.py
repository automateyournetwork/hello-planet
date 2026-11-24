#!/usr/bin/env python3
"""Create public map landmarks/boundaries from cached public-domain Natural Earth.
Run explicitly; no visitor data or network lookup is used here.
"""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SOURCE='https://github.com/nvkelso/natural-earth-vector'
def read(name):return json.loads((ROOT/'private/geoip'/name).read_text())
def simplify(points,tolerance=.045):
 if len(points)<3:return points
 a,b=points[0],points[-1];dx=b[0]-a[0];dy=b[1]-a[1];den=dx*dx+dy*dy
 maxd=0;index=0
 for i,p in enumerate(points[1:-1],1):
  t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
  d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2
  if d>maxd:maxd=d;index=i
 if maxd<=tolerance*tolerance:return [a,b]
 return simplify(points[:index+1],tolerance)[:-1]+simplify(points[index:],tolerance)
lines=[];provinces=[]
for f in read('natural-earth-regions.json')['features']:
 p=f['properties']
 if p.get('iso_a2')!='CA':continue
 provinces.append({'code':p['iso_3166_2'],'name':p.get('name_en') or p['name']})
 polys=f['geometry']['coordinates'] if f['geometry']['type']=='MultiPolygon' else [f['geometry']['coordinates']]
 for poly in polys:
  ring=poly[0]
  if max(x[0] for x in ring)-min(x[0] for x in ring)<.1 and max(x[1] for x in ring)-min(x[1] for x in ring)<.1:continue
  middle=len(ring)//2;line=simplify(ring[:middle+1])[:-1]+simplify(ring[middle:])
  if len(line)>3:lines.append([[round(x,4),round(y,4)] for x,y,*_ in line])
landmarks=[]
for f in read('natural-earth-cities.json')['features']:
 p=f['properties'];country=p.get('iso_a2');kind=p['featurecla'];population=p.get('pop_max') or 0
 if not country or country=='-99':continue
 national=bool(p.get('adm0cap'));regional=country in ['US','CA'] and 'Admin-1 capital' in kind
 if not (national or regional or population>=3_000_000 or (country in ['US','CA'] and population>=400_000) or (p.get('scalerank',10)<=3 and population>=1_000_000)):continue
 landmarks.append({'id':str(p['ne_id']),'name':p['name'],'country':country,'region':p.get('adm1name'),'lat':round(p['latitude'],2),'lon':round(p['longitude'],2),'kind':'National capital' if national else ('State / province capital' if regional else 'Major city')})
landmarks.sort(key=lambda p:(p['country'],p['name']))
out=ROOT/'public/data'
(out/'canada-province-borders.json').write_text(json.dumps({'source':SOURCE,'attribution':'Natural Earth admin-1, public domain; simplified display boundaries','provinces':provinces,'lines':lines},ensure_ascii=False,separators=(',',':'))+'\n')
# Astro renders the same landmark collection into a keyboard-accessible selector.
(ROOT/'src/data/globe-landmarks.json').write_text(json.dumps({'source':SOURCE,'attribution':'Natural Earth populated places, public domain','places':landmarks},ensure_ascii=False,indent=2)+'\n')
print(len(provinces),'provinces/territories;',len(lines),'boundary lines;',len(landmarks),'city landmarks')
