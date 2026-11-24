import config from '../../globe.config.json';
export function mountHitCounter(root:HTMLElement){
 const value=root.querySelector<HTMLElement>('[data-hit-number]')!,label=root.querySelector<HTMLElement>('[data-hit-label]')!,detail=root.querySelector<HTMLElement>('[data-hit-detail]')!;
 const endpoint=document.body.dataset.visitorEndpoint;let current=config.baselineViews,frame=0,fetching=false;
 const show=(next:number)=>{
  cancelAnimationFrame(frame);const start=current,started=performance.now();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){current=next;value.textContent=next.toLocaleString('en-CA');return;}
  const tick=(now:number)=>{const t=Math.max(0,Math.min(1,(now-started)/650));current=Math.round(start+(next-start)*(1-(1-t)**3));value.textContent=current.toLocaleString('en-CA');if(t<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
 };
 async function refresh(){
  if(!endpoint||document.hidden||fetching)return;fetching=true;
  try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();const data=await response.json();
   if(!['local-preview','production'].includes(data.source)||!Number.isSafeInteger(data.lifetimeViews)||!Number.isSafeInteger(data.baselineViews)||!Number.isSafeInteger(data.totalViews)||data.baselineViews<0||data.totalViews<0||data.lifetimeViews!==data.baselineViews+data.totalViews)throw Error();
   const local=data.source==='local-preview';label.textContent=local?'LIVE PAGE VIEWS · LOCAL PREVIEW':'LIVE PAGE VIEWS';detail.textContent=`${data.baselineViews.toLocaleString('en-CA')} archived + ${data.totalViews.toLocaleString('en-CA')} ${local?'local preview':'new site'} views.${local?' Production is unchanged.':''}`;root.dataset.counterScope=data.source;root.dataset.live='true';if(data.lifetimeViews!==current)show(data.lifetimeViews);
  }catch{root.dataset.live='false';label.textContent='LAST CONFIRMED PAGE VIEWS';detail.textContent='Showing the last confirmed count. The new-visit counter is unavailable.';}finally{fetching=false;}
 }
 void refresh();const timer=setInterval(refresh,3000);document.addEventListener('visibilitychange',refresh);document.addEventListener('traffic-recorded',refresh);
 window.addEventListener('pagehide',event=>{if(event.persisted)return;clearInterval(timer);cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',refresh);document.removeEventListener('traffic-recorded',refresh);});
}
