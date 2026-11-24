// First-party presence; each document has one deduplicated page-view event.
export function startVisitorCounter(endpoint:string){
 if(!endpoint||navigator.webdriver||navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)return;
 let session:string;try{session=sessionStorage.getItem('ayn-preview-session')||crypto.randomUUID();sessionStorage.setItem('ayn-preview-session',session);}catch{return;}
 const page=crypto.randomUUID();let alive=true,recorded=false;
 const send=(type:string)=>{if(!alive&&type!=='leave')return;if(type==='heartbeat'&&!recorded)type='view';void fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,type,path:location.pathname,event:page,page}),keepalive:type==='leave'}).then(r=>{if(r.ok){if(type==='view')recorded=true;document.dispatchEvent(new Event('traffic-recorded'));}}).catch(()=>{});};
 // Repeated view messages share an event ID, so retries and bfcache restores
 // register presence without counting the same page twice.
 if(!document.hidden)send('view');
 const startTimer=()=>window.setInterval(()=>{if(!document.hidden)send('heartbeat');},25000);
 let timer=startTimer();
 document.addEventListener('visibilitychange',()=>send(document.hidden?'leave':'view'));
 window.addEventListener('pagehide',()=>{send('leave');alive=false;clearInterval(timer);});
 window.addEventListener('pageshow',event=>{if(event.persisted){alive=true;if(!document.hidden)send('view');timer=startTimer();}});
}
