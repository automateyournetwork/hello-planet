import config from '../../globe.config.json';
import jetpack from '../data/jetpack-summary.json';
import recovered from '../data/traffic-history.json';
import {PCGlobeAudio,themes,type Score,type Voice} from './pc-globe-audio';
export type VisitorPlace={code:string;name:string;lat:number;lon:number;value:number;level?:string};
export type VisitorSnapshot={source:string;active:number;todayViews:number;todayVisitors:number;totalViews:number;locations:VisitorPlace[];todayLocations?:VisitorPlace[];viewerLocation?:Omit<VisitorPlace,'value'>|null};
type Country={code:string;id:string;name:string;capital:string;region:string;subregion:string;languages:string;currencies:string;area:number;lat:number;lon:number};
type Shape={id:string;name:string;polygons:number[][][][]};
type AnthemIndex=Record<string,{title:string;file:string}>;
const fmt=(n:number)=>n.toLocaleString('en-CA');
const project=(lat:number,lon:number)=>[(lon+180)*2,(90-lat)*2];
const privacy=()=>navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true;
const home={...config.home,code:config.home.country};
const palettes:Record<string,string[]>={ega:['#008855','#00aa88','#55aa55','#aa8855','#5599aa','#888855','#aa6699'],cga:['#00aaaa','#aa00aa','#008888','#880088'],amber:['#805000','#996600','#aa7700','#664400']};
async function read<T>(file:string):Promise<T>{const response=await fetch(`/pc-globe/${file}`,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`${file} unavailable`);return response.json();}
// Unwrap rings across the date line, then repeat at the world edges.
// Antarctica deliberately closes along the projection's southern edge.
function shapePath(shape:Shape){
 return shape.polygons.map(poly=>{
  const rings=poly.map(ring=>{let previous=ring[0][0];return ring.map(([lon,lat],i)=>{let unwrapped=lon;if(shape.id!=='010'&&i){while(unwrapped-previous>180)unwrapped-=360;while(unwrapped-previous< -180)unwrapped+=360;}previous=unwrapped;return project(lat,unwrapped);});});
  const xs=rings.flat().map(point=>point[0]),minimum=Math.min(...xs),maximum=Math.max(...xs);
  return [-720,0,720].filter(shift=>maximum+shift>0&&minimum+shift<720).map(shift=>rings.map(ring=>ring.map(([x,y],i)=>`${i?'L':'M'}${(x+shift).toFixed(2)},${y.toFixed(2)}`).join(' ')+'Z').join(' ')).join(' ');
 }).join(' ');
}
function svg<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>={}){const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
export function mountPCGlobe(root:HTMLElement){
 const $=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const text=(selector:string,value:string)=>{$(selector).textContent=value;};
 let countries:Country[]=[],shapes:Shape[]=[],anthems:AnthemIndex={},loaded=false,loading=false,active=false;
 let snapshot:VisitorSnapshot|null=null,period='history',selected=config.home.country,selectedPlace:string|null=null;
 let places:VisitorPlace[]=[],audioRequest=0,viewport=[0,0,720,360];
 let oldBodyOverflow='',expanded=false;
 const overlays={visitors:true,flags:true,grid:true,home:true};
 const map=$<SVGSVGElement>('[data-pc-map]');
 const audio=new PCGlobeAudio((message,playing)=>{text('[data-pc-audio-status]',message);root.dataset.playing=String(playing);});
 const soundButton=$<HTMLButtonElement>('[data-pc-sound-toggle]');
 const syncSound=()=>{soundButton.textContent=audio.enabled?'Sound: on':'Sound: off';soundButton.setAttribute('aria-pressed',String(audio.enabled));};
 const stop=(message?:string)=>{audioRequest++;audio.stop(message);};
 const countryCode=(p:{code:string;name:string})=>countries.some(c=>c.code===p.code)?p.code:(p.code.match(/^([A-Z]{2})-/)?.[1]||p.name.match(/,\s*([A-Z]{2})$/)?.[1]||'');
 const isHistory=()=>period==='history'||period==='recovered';
 const unit=()=>period==='recovered'?'sessions':period==='history'?'reported views':period==='today'?'page views':'active sessions';
 const flag=(code:string)=>`/pc-globe/flags/${code.toLowerCase()}.svg`;
 function setExpanded(value:boolean){
  expanded=value;root.classList.toggle('is-expanded',value);const b=$<HTMLButtonElement>('[data-pc-expand]');b.setAttribute('aria-pressed',String(value));b.setAttribute('aria-label',value?'Restore PC Globe size':'Expand PC Globe');
  if(value){oldBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else document.body.style.overflow=oldBodyOverflow;
 }
 function setViewport(){
  const [,,w,h]=viewport;viewport[0]=Math.max(0,Math.min(720-w,viewport[0]));viewport[1]=Math.max(0,Math.min(360-h,viewport[1]));map.setAttribute('viewBox',viewport.join(' '));map.style.touchAction=w<720?'none':'pan-y';renderPins();
 }
 function zoom(factor:number){const [x,y,w,h]=viewport,nw=Math.max(120,Math.min(720,w*factor));viewport=[x+(w-nw)/2,y+(h-nw/2)/2,nw,nw/2];setViewport();}
 function focus(lat:number,lon:number){const [x,y]=project(lat,lon);if(viewport[2]<720){viewport[0]=x-viewport[2]/2;viewport[1]=y-viewport[3]/2;setViewport();}}
 function paint(){
  const colors=palettes[root.dataset.palette||'ega'];root.querySelectorAll<SVGPathElement>('[data-pc-shape]').forEach((p,i)=>{p.setAttribute('fill',colors[i%colors.length]);p.classList.toggle('is-selected',p.dataset.pcShape===selected);});
 }
 function countryTraffic(){
  const matches=places.filter(p=>countryCode(p)===selected),sum=matches.reduce((n,p)=>n+p.value,0);
  const description=isHistory()?(matches.length?`${fmt(sum)} ${unit()} · country total`:'Not listed in this top-ten country report'):!snapshot?'Live counter unavailable':`${fmt(sum)} ${unit()} at mapped locations`;
  text('[data-pc-country-traffic]',description);
 }
 function selectCountry(code:string,detail?:string){
  const country=countries.find(c=>c.code===code);if(!country)return;
  const changed=selected!==code;selected=code;selectedPlace=null;if(changed)stop('Country changed. Press Play anthem to listen.');
  $<HTMLSelectElement>('[data-pc-country]').value=code;
  text('[data-pc-country-code]',code);text('[data-pc-country-name]',country.name);text('[data-pc-country-region]',[country.region,country.subregion].filter(Boolean).join(' · '));
  text('[data-pc-capital]',country.capital);text('[data-pc-area]',`${fmt(country.area)} km²`);text('[data-pc-languages]',country.languages||'Not recorded');text('[data-pc-currency]',country.currencies||'Not recorded');
  const img=$<HTMLImageElement>('[data-pc-flag]');img.src=flag(code);img.alt=`Flag of ${country.name}`;
  const entry=anthems[code];$<HTMLButtonElement>('[data-pc-anthem]').disabled=!entry;text('[data-pc-anthem-credit]',entry?`${entry.title} · opening excerpt. Score credits appear during playback.`:'No licensed anthem excerpt in this collection. Explore the country or play an original theme.');
  text('[data-pc-location-detail]',detail||'Country reference · select a visitor in the directory for its traffic count.');
  root.dataset.country=code;paint();countryTraffic();focus(country.lat,country.lon);highlightDirectory();
 }
 function choosePlace(p:VisitorPlace){
  const detail=`${p.name} · ${fmt(p.value)} ${unit()} · ${isHistory()?'country aggregate, not a visitor at this point':p.level==='city'?'approximate city estimate':'approximate state / province estimate'}.`;
  const code=countryCode(p);if(code)selectCountry(code,detail);else text('[data-pc-location-detail]',detail);
  selectedPlace=p.code;focus(p.lat,p.lon);highlightDirectory();audio.click();
 }
 function highlightDirectory(){root.querySelectorAll<HTMLButtonElement>('[data-pc-visit]').forEach(b=>b.setAttribute('aria-pressed',String(selectedPlace?b.dataset.pcVisit===selectedPlace:b.dataset.pcVisitCountry===selected)));}
 function drawMap(){
  const group=$('[data-pc-land]');group.replaceChildren();
  for(const shape of shapes){
   const country=countries.find(c=>c.id&&c.id===shape.id);const path=svg('path',{'data-pc-shape':country?.code||shape.name,'fill-rule':'evenodd',d:shapePath(shape)});
   const title=svg('title');title.textContent=country?.name||shape.name;path.append(title);if(country)path.addEventListener('click',()=>{if(!dragged){selectCountry(country.code);audio.click();}});group.append(path);
  }
  const grid=$('[data-pc-grid]');grid.replaceChildren();for(let x=0;x<=720;x+=60)grid.append(svg('path',{d:`M${x},0V360`}));for(let y=0;y<=360;y+=60)grid.append(svg('path',{d:`M0,${y}H720`}));paint();
 }
 function renderPins(){
  const group=$('[data-pc-pins]');const focused=(document.activeElement as SVGElement|null)?.getAttribute('data-pc-marker');group.replaceChildren();
  const scale=viewport[2]/720;
  function pin(p:{lat:number;lon:number;name:string;code:string},kind:'traffic'|'home'|'you',action:()=>void){
   const [x,y]=project(p.lat,p.lon),code=countryCode(p);const g=svg('g',{transform:`translate(${x} ${y}) scale(${scale})`,'data-pc-marker':`${kind}:${p.code}`,role:'button',tabindex:0,'aria-label':kind==='traffic'?`${p.name}, ${fmt((p as VisitorPlace).value)} ${unit()}`:p.name});
   const title=svg('title');title.textContent=g.getAttribute('aria-label');g.append(title);
   // Generous transparent hit target; visual dots remain small and meaningful.
   g.append(svg('circle',{r:10,fill:'transparent'}));
   if(kind==='traffic'&&isHistory())g.append(svg('path',{d:'M0,-5 L5,0 L0,5 L-5,0Z',fill:'var(--pc-history)',stroke:'#000','stroke-width':1}));
   else g.append(svg('circle',{r:kind==='traffic'?4:6,fill:kind==='home'?'#ff55aa':kind==='you'?'#aaff55':'var(--pc-dot)',stroke:'#000','stroke-width':1.3}));
   if(overlays.flags&&code)g.append(svg('image',{href:kind==='home'?'/images/home-flags.svg':flag(code),x:8,y:-20,width:kind==='home'?44:24,height:18,'aria-hidden':'true'}));
   if(kind!=='traffic'){const t=svg('text',{x:9,y:11,fill:'#fff',stroke:'#000','stroke-width':3,'paint-order':'stroke','font-size':11,'font-family':'monospace','aria-hidden':'true'});t.textContent=kind==='home'?'HOME':'YOU';g.append(t);}
   g.addEventListener('click',()=>{if(!dragged)action();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();action();}});group.append(g);if(focused===`${kind}:${p.code}`)g.focus();
  }
  if(overlays.visitors)for(const p of places)pin(p,'traffic',()=>choosePlace(p));
  if(overlays.home){pin(home,'home',()=>{selectCountry(home.code,`${home.name}. Home base, not a visitor or precise address.`);focus(home.lat,home.lon);audio.click();});const self=!privacy()&&snapshot?.viewerLocation;if(self)pin({...self,name:`You · ${self.name}`},'you',()=>{const code=countryCode(self);if(code)selectCountry(code,`You · ${self.name}. Current approximate location, separate from historical totals.`);focus(self.lat,self.lon);});}
  $<SVGGElement>('[data-pc-grid]').style.display=overlays.grid?'':'none';root.dataset.pinCount=String(overlays.visitors?places.length:0);
 }
 function directory(){
  const list=$('[data-pc-directory]');const focusCode=(document.activeElement as HTMLElement)?.dataset?.pcVisit;list.replaceChildren();
  for(const p of [...places].sort((a,b)=>b.value-a.value)){
   const button=document.createElement('button'),code=countryCode(p);button.dataset.pcVisit=p.code;button.dataset.pcVisitCountry=code;
   if(code){const img=document.createElement('img');img.src=flag(code);img.alt='';img.width=24;img.height=18;button.append(img);}
   const name=document.createElement('span'),count=document.createElement('strong');name.textContent=p.name;count.textContent=fmt(p.value);button.append(name,count);button.addEventListener('click',()=>choosePlace(p));list.append(button);if(focusCode===p.code)button.focus();
  }
  if(!places.length){const p=document.createElement('p');p.textContent=snapshot?'No mapped locations in this window. Local and unresolved visits stay unmapped.':'Live counter unavailable. Historical reports are still available in DATA.';list.append(p);}
  text('[data-pc-directory-count]',`[${places.length}]`);highlightDirectory();
 }
 function update(){
  if(!loaded)return;
  if(period==='history')places=jetpack.countries.map(c=>({...c,value:c.views}));else if(period==='recovered')places=recovered.countries.map(c=>({...c,value:c.sessions}));else places=(period==='today'?snapshot?.todayLocations:snapshot?.locations)||[];
  places=places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Number.isFinite(p.value)&&p.value>0&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180);
  const total=isHistory()?places.reduce((n,p)=>n+p.value,0):snapshot?(period==='now'?snapshot.active:snapshot.todayViews):null;
  text('[data-pc-total]',total===null?'—':fmt(total));text('[data-pc-total-label]',isHistory()?`Top 10 ${period==='history'?'views':'sessions'}`:period==='now'?'Active · last 90 sec':'Views today');text('[data-pc-locations]',fmt(places.length));text('[data-pc-country-count]',fmt(countries.length));
  text('[data-pc-map-caption]',isHistory()?'COUNTRY TOTALS':'CITY / REGION ESTIMATES');
  const source=period==='history'?'JOHN’S SAMPLE · JETPACK · JAN 2024–SEP 24, 2026':period==='recovered'?'JOHN’S SAMPLE · RECOVERED · AUG 21–SEP 19, 2026':snapshot?`${snapshot.source==='production'?'LIVE':'LOCAL PREVIEW'} · ${new Date().toLocaleTimeString()}`:'LIVE COUNTER UNAVAILABLE';
  text('[data-pc-source]',source);text('[data-pc-ready]',isHistory()||snapshot?'READY':'OFFLINE');
  text('[data-pc-data-note]',isHistory()?'John’s sample history. Top-ten subtotal, not all site traffic. Pins are country aggregates; the two historical reports overlap and are never added together.':'Anonymous visitor data · Today uses the configured server timezone. IP locations are approximate. Unresolved visits count in totals but have no map pin.');
  root.dataset.period=period;directory();renderPins();countryTraffic();
  if(selectedPlace){const p=places.find(p=>p.code===selectedPlace);text('[data-pc-location-detail]',p?`${p.name} · ${fmt(p.value)} ${unit()} · ${isHistory()?'country aggregate, not a visitor at this point':p.level==='city'?'approximate city estimate':'approximate state / province estimate'}.`:'The selected location is no longer present in this traffic window.');}
 }
 async function load(){
  if(loaded||loading)return;loading=true;$<HTMLElement>('[data-pc-loading]').hidden=false;
  try{
   const results=await Promise.allSettled([read<Country[]>('countries.json'),read<Shape[]>('map.json'),read<AnthemIndex>('anthems/index.json')]);
   if(results[0].status==='rejected')throw results[0].reason;countries=results[0].value;
   if(results[1].status==='fulfilled')shapes=results[1].value;
   if(results[2].status==='fulfilled')anthems=results[2].value;
   const selector=$<HTMLSelectElement>('[data-pc-country]');selector.replaceChildren(...countries.map(c=>new Option(c.name,c.code)));loaded=true;drawMap();selectCountry(selected);update();
   $<HTMLElement>('[data-pc-loading]').hidden=shapes.length>0;if(!shapes.length)text('[data-pc-loading]','Map unavailable. Country profiles and the visitor directory still work.');
   root.dataset.ready='true';if(!Object.keys(anthems).length)text('[data-pc-audio-status]','Anthem index unavailable. Original themes still work.');
  }catch{text('[data-pc-loading]','Atlas unavailable. Reopen PC GLOBE to retry.');text('[data-pc-ready]','READ ERROR');}finally{loading=false;}
 }
 $<HTMLSelectElement>('[data-pc-country]').addEventListener('change',e=>{selectCountry((e.target as HTMLSelectElement).value);audio.click();});
 $<HTMLSelectElement>('[data-pc-period]').addEventListener('change',e=>{period=(e.target as HTMLSelectElement).value;selectedPlace=null;text('[data-pc-location-detail]','Traffic window changed. Select a visitor for details.');update();audio.click();});
 $<HTMLSelectElement>('[data-pc-palette]').addEventListener('change',e=>{root.dataset.palette=(e.target as HTMLSelectElement).value;paint();audio.click();});
 root.querySelectorAll<HTMLButtonElement>('[data-pc-overlay]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.pcOverlay as keyof typeof overlays;overlays[key]=!overlays[key];b.setAttribute('aria-pressed',String(overlays[key]));renderPins();audio.click();}));
 root.querySelectorAll<HTMLButtonElement>('[data-pc-zoom]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.pcZoom==='reset'){viewport=[0,0,720,360];setViewport();}else zoom(b.dataset.pcZoom==='in'?.65:1.5);audio.click();}));
 $('[data-pc-home]').addEventListener('click',()=>{viewport=[0,0,280,140];selectCountry(home.code,`${home.name}. Home base, not a visitor.`);focus(home.lat,home.lon);audio.click();});
 $('[data-pc-help-toggle]').addEventListener('click',()=>{const panel=$<HTMLElement>('[data-pc-help]');panel.hidden=!panel.hidden;$('[data-pc-help-toggle]').setAttribute('aria-expanded',String(!panel.hidden));audio.click();});
 $('[data-pc-expand]').addEventListener('click',()=>setExpanded(!expanded));
 let dragged=false,down:{x:number;y:number;view:number[]}|null=null;
 map.addEventListener('pointerdown',e=>{dragged=false;down={x:e.clientX,y:e.clientY,view:[...viewport]};});
 map.addEventListener('pointermove',e=>{if(!down||viewport[2]===720)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)<5&&!dragged)return;dragged=true;map.setPointerCapture(e.pointerId);const box=map.getBoundingClientRect();viewport=[down.view[0]-dx/box.width*down.view[2],down.view[1]-dy/box.height*down.view[3],down.view[2],down.view[3]];setViewport();});
 map.addEventListener('pointerup',()=>{down=null;});map.addEventListener('pointercancel',()=>{down=null;});
 map.addEventListener('keydown',e=>{if(e.target!==map)return;const key=e.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(key))return;e.preventDefault();if(key==='+'||key==='=')zoom(.7);else if(key==='-')zoom(1.4);else if(key==='0'){viewport=[0,0,720,360];setViewport();}else{viewport[0]+=(key==='ArrowRight'?1:key==='ArrowLeft'?-1:0)*viewport[2]*.12;viewport[1]+=(key==='ArrowDown'?1:key==='ArrowUp'?-1:0)*viewport[3]*.12;setViewport();}});
 soundButton.addEventListener('click',async()=>{try{if(audio.enabled){audioRequest++;audio.mute();}else{await audio.enable();if(!active){audio.mute();return;}audio.click();text('[data-pc-audio-status]','Sound enabled · choose an anthem or original theme.');}syncSound();}catch{text('[data-pc-audio-status]','Audio unavailable in this browser.');}});
 $<HTMLInputElement>('[data-pc-volume]').addEventListener('input',e=>audio.setVolume(Number((e.target as HTMLInputElement).value)/100));
 $<HTMLSelectElement>('[data-pc-voice]').addEventListener('change',e=>{stop('Voice changed. Press play to listen.');audio.voice=(e.target as HTMLSelectElement).value as Voice;});
 $('[data-pc-stop]').addEventListener('click',()=>stop());
 $('[data-pc-play-theme]').addEventListener('click',async()=>{const request=++audioRequest;try{await audio.play(themes[$<HTMLSelectElement>('[data-pc-theme]').value]);if(request!==audioRequest||!active){audio.stop();return;}syncSound();}catch{text('[data-pc-audio-status]','Audio unavailable in this browser.');}});
 $('[data-pc-anthem]').addEventListener('click',async()=>{
  const entry=anthems[selected];if(!entry)return;stop('Loading anthem score…');const request=audioRequest;
  try{
   // Unlock audio in the initiating user gesture before the score fetch.
   await audio.enable();const score=await read<Score>(`anthems/${entry.file}`);if(request!==audioRequest||!active)return;
   const credit=$('[data-pc-anthem-credit]');credit.replaceChildren();const link=document.createElement('a');link.href=score.source||'/pc-globe/anthems/CREDITS.md';link.textContent=`${entry.title} · source score`;link.target='_blank';link.rel='noopener noreferrer';credit.append(link,` · ${score.author} · ${score.license}. Synthesized opening excerpt.`);
   await audio.play({...score,title:`${entry.title} · opening excerpt`});syncSound();
  }catch{if(request===audioRequest){stop('Anthem could not be loaded. Please try again.');syncSound();}}
 });
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){stop();$<HTMLElement>('[data-pc-help]').hidden=true;$('[data-pc-help-toggle]').setAttribute('aria-expanded','false');if(expanded){setExpanded(false);$<HTMLButtonElement>('[data-pc-expand]').focus();}}});
 const onVisibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',onVisibility);
 window.addEventListener('pagehide',e=>{stop();if(expanded)setExpanded(false);if(!e.persisted){document.removeEventListener('visibilitychange',onVisibility);audio.dispose();}});
 return {selectLandmark(p:{country:string;name:string;lat:number;lon:number}){selectCountry(p.country,`${p.name} · geographic landmark, not a visitor.`);viewport=[0,0,200,100];focus(p.lat,p.lon);},setActive(value:boolean){const wasActive=active;active=value;root.hidden=!value;if(value){void load();if(loaded)update();}else if(wasActive){stop();if(expanded)setExpanded(false);}},setSnapshot(value:VisitorSnapshot|null){snapshot=value;if(active)update();}};
}
