import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const locations=[{code:'city:montreal',name:'Montréal, Quebec, CA',lat:45.5,lon:-73.6,value:2,level:'city'},{code:'city:newyork',name:'New York City, New York, US',lat:40.7,lon:-74,value:3,level:'city'}];
const snapshot={source:'production',active:5,todayViews:9,todayVisitors:6,totalViews:42,locations,todayLocations:[{...locations[0],value:4},{...locations[1],value:5}],viewerLocation:{code:'CA-ON',name:'Ontario, CA',lat:50,lon:-85}};
async function open(page:Page){await page.route(/\/api\/traffic\/?(?:\?.*)?$/,r=>r.fulfill({json:snapshot}));await page.goto('/');await page.getByRole('button',{name:'PC GLOBE',exact:true}).click();await expect(page.locator('[data-pc-globe]')).toHaveAttribute('data-ready','true');}

test('PC GLOBE is a fourth view with real historical reports and country profiles',async({page})=>{
 await open(page);const pc=page.locator('[data-pc-globe]');await expect(page.locator('[data-modern-globe]')).toBeHidden();await expect(pc.locator('[data-pc-country] option')).toHaveCount(250);await expect(pc.locator('[data-pc-visit]')).toHaveCount(10);await expect(pc.locator('[data-pc-country-traffic]')).toHaveText('1,800 reported views · country total');
 await pc.locator('[data-pc-visit="US"]').click();await expect(pc.locator('[data-pc-country-name]')).toHaveText('United States');await expect(pc.locator('[data-pc-country-traffic]')).toHaveText('14,133 reported views · country total');await expect(pc.locator('[data-pc-location-detail]')).toContainText('not a visitor');await expect(pc.locator('[data-pc-flag]')).toHaveAttribute('src','/pc-globe/flags/us.svg');
 await pc.locator('[data-pc-period]').selectOption('recovered');await expect(pc.locator('[data-pc-country-traffic]')).toHaveText('416 sessions · country total');
 await pc.locator('[data-pc-country]').selectOption('SG');await expect(pc.locator('[data-pc-anthem]')).toBeDisabled();await expect(pc.locator('[data-pc-anthem-credit]')).toContainText('No licensed anthem');
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(pc).toBeHidden();await expect(page.locator('[data-modern-globe]')).toBeVisible();await expect(page.locator('[data-region-list] button')).toHaveCount(10);
});

test('live and today use the same snapshot, preserve selection, and clear stale counts on failure',async({page})=>{
 await open(page);const pc=page.locator('[data-pc-globe]');await pc.locator('[data-pc-period]').selectOption('now');await expect(pc.locator('[data-pc-total]')).toHaveText('5');await expect(pc.locator('[data-pc-visit]')).toHaveCount(2);await expect(pc.locator('[data-pc-marker="you:CA-ON"]')).toBeVisible();
 await pc.locator('[data-pc-visit="city:montreal"]').click();await expect(pc.locator('[data-pc-location-detail]')).toContainText('2 active sessions · approximate city estimate');await page.evaluate(()=>document.dispatchEvent(new Event('traffic-recorded')));await expect(pc.locator('[data-pc-visit="city:montreal"]')).toHaveAttribute('aria-pressed','true');
 await pc.locator('[data-pc-period]').selectOption('today');await expect(pc.locator('[data-pc-total]')).toHaveText('9');await expect(pc.locator('[data-pc-country-traffic]')).toHaveText('4 page views at mapped locations');
 await page.route(/\/api\/traffic\/?(?:\?.*)?$/,r=>r.fulfill({status:503,body:'unavailable'}));await page.evaluate(()=>document.dispatchEvent(new Event('traffic-recorded')));await expect(pc.locator('[data-pc-total]')).toHaveText('—');await expect(pc.locator('[data-pc-marker^="you:"]')).toHaveCount(0);await expect(pc.locator('[data-pc-directory]')).toContainText('Live counter unavailable');await pc.locator('[data-pc-period]').selectOption('history');await expect(pc.locator('[data-pc-visit]')).toHaveCount(10);
});

test('map controls, country clicks, overlays, gazetteer, palettes and expansion work',async({page})=>{
 await open(page);const pc=page.locator('[data-pc-globe]');await pc.locator('[data-pc-shape="BR"]').click();await expect(pc.locator('[data-pc-country-name]')).toHaveText('Brazil');
 await pc.locator('[data-pc-overlay="visitors"]').click();await expect(pc).toHaveAttribute('data-pin-count','0');await expect(pc.locator('[data-pc-visit]')).toHaveCount(10);await pc.locator('[data-pc-overlay="visitors"]').click();await expect(pc).toHaveAttribute('data-pin-count','10');
 await pc.locator('[data-pc-palette]').selectOption('amber');await expect(pc).toHaveAttribute('data-palette','amber');await pc.locator('[data-pc-zoom="in"]').click();await expect(pc.locator('[data-pc-map]')).not.toHaveAttribute('viewBox','0 0 720 360');await pc.locator('[data-pc-map]').focus();await page.keyboard.press('0');await expect(pc.locator('[data-pc-map]')).toHaveAttribute('viewBox','0 0 720 360');
 await pc.getByText('City gazetteer · 503 places',{exact:true}).click();await pc.locator('[data-atlas-search]').fill('Ottawa');await pc.locator('[data-atlas-select]').selectOption({index:1});await expect(pc.locator('[data-pc-location-detail]')).toContainText('Ottawa · geographic landmark');
 await pc.locator('[data-pc-expand]').click();await expect(pc).toHaveClass(/is-expanded/);await page.keyboard.press('Escape');await expect(pc).not.toHaveClass(/is-expanded/);
});

test('audio is opt-in, generates quantized PCM, stops on mute and leaving the tab',async({page})=>{
 await page.addInitScript(()=>{const win=window as any;win.pcAudioBuffers=[];win.pcAudioStarts=0;const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){win.pcAudioStarts++;if(this.buffer)win.pcAudioBuffers.push({rate:this.buffer.sampleRate,samples:Array.from(this.buffer.getChannelData(0).slice(200,500))});return original.apply(this,args);};});
 await open(page);expect(await page.evaluate(()=>(window as any).pcAudioStarts)).toBe(0);const pc=page.locator('[data-pc-globe]');await pc.locator('[data-pc-anthem]').click();await expect(pc).toHaveAttribute('data-playing','true');await expect(pc.locator('[data-pc-audio-status]')).toContainText('O Canada');
 const buffers=await page.evaluate(()=>(window as any).pcAudioBuffers as {rate:number;samples:number[]}[]);expect(buffers.length).toBeGreaterThan(5);expect(buffers.every(b=>b.rate===22050)).toBe(true);expect(buffers.some(b=>b.samples.some(s=>Math.abs(s)>.01))).toBe(true);expect(buffers.every(b=>b.samples.every(s=>Math.abs(s*32767-Math.round(s*32767))<.002))).toBe(true);
 await pc.locator('[data-pc-voice]').selectOption('square');await expect(pc).toHaveAttribute('data-playing','false');await pc.locator('[data-pc-anthem]').click();await expect(pc).toHaveAttribute('data-playing','true');await pc.locator('[data-pc-sound-toggle]').click();await expect(pc).toHaveAttribute('data-playing','false');await expect(pc.locator('[data-pc-sound-toggle]')).toHaveAttribute('aria-pressed','false');await pc.locator('[data-pc-play-theme]').click();await expect(pc).toHaveAttribute('data-playing','true');await page.getByRole('button',{name:'Right now',exact:true}).click();await expect(pc).toHaveAttribute('data-playing','false');
});

test('a late anthem fetch cannot start audio after leaving PC GLOBE',async({page})=>{
 let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>release=resolve);await page.route('**/pc-globe/anthems/CA.json',async route=>{await gate;await route.continue();});await open(page);await page.locator('[data-pc-anthem]').click();await page.getByRole('button',{name:'Today',exact:true}).click();release();await expect(page.locator('[data-pc-globe]')).toHaveAttribute('data-playing','false');await expect(page.locator('[data-pc-globe]')).toBeHidden();
});

test('privacy preference suppresses the YOU overlay and map failure retains country access',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{value:true}));await page.route('**/pc-globe/map.json',r=>r.fulfill({status:503,body:'unavailable'}));await open(page);const pc=page.locator('[data-pc-globe]');await expect(pc.locator('[data-pc-marker^="you:"]')).toHaveCount(0);await expect(pc.locator('[data-pc-loading]')).toContainText('Map unavailable');await pc.locator('[data-pc-country]').selectOption('FR');await expect(pc.locator('[data-pc-capital]')).toHaveText('Paris');await expect(pc.locator('[data-pc-visit]')).toHaveCount(10);
});

test('PC Globe is accessible and fits desktop and narrow mobile screens',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});await open(page);expect((await new AxeBuilder({page}).include('[data-pc-globe]').analyze()).violations).toEqual([]);await page.locator('[data-globe]').screenshot({path:'artifacts/pc-globe-desktop.png'});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('[data-globe]').screenshot({path:'artifacts/pc-globe-mobile.png'});await page.setViewportSize({width:320,height:700});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.pc-readouts strong').evaluateAll(nodes=>nodes.every(node=>{const range=document.createRange();range.selectNodeContents(node);return range.getBoundingClientRect().width<=node.clientWidth;}))).toBe(true);
});
