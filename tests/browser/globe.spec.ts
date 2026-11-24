import {test,expect} from '@playwright/test';

test('atlas searches, selects, survives polling and returns to traffic without writes',async({page,request})=>{
 const errors:string[]=[];let writes=0;page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/traffic'))writes++;});
 const before=await (await request.get('/api/traffic/')).json();
 await page.goto('/');await expect(page.locator('[data-globe]')).toHaveClass(/has-webgl/);await expect(page.locator('[data-control="home"]')).toBeEnabled();
 await page.getByRole('button',{name:'PC GLOBE',exact:true}).click();
 await page.locator('.pc-city-explorer').evaluate(e=>e.setAttribute('open',''));await page.locator('[data-atlas-search]').fill('Japan');
 const tokyo=await page.locator('[data-atlas-select] option').filter({hasText:'Tokyo'}).getAttribute('value');
 await page.locator('[data-atlas-select]').selectOption(tokyo!);
 await expect(page.locator('[data-atlas-detail]')).toContainText('Tokyo · Japan');
 await expect(page.locator('[data-atlas-learn]')).toHaveAttribute('href',/Tokyo%20Japan/);
 await expect(page.locator('[data-pc-location-detail]')).toContainText('Tokyo');
 await page.waitForTimeout(3200);
 await expect(page.locator('[data-pc-location-detail]')).toContainText('Tokyo');
 await page.locator('.pc-city-explorer').evaluate(e=>e.setAttribute('open',''));await page.locator('[data-atlas-search]').fill('zzzzzzzzzzz');await expect(page.locator('[data-atlas-surprise]')).toBeDisabled();
 await page.locator('.pc-city-explorer').evaluate(e=>e.setAttribute('open',''));await page.locator('[data-atlas-search]').fill('');await page.locator('[data-atlas-surprise]').click();await expect(page.locator('[data-atlas-learn]')).toContainText('Explore');
 await page.getByRole('button',{name:'Right now',exact:true}).click();await expect(page.locator('[data-atlas-panel]')).toBeHidden();await expect(page.locator('[data-hit-counter]')).toBeVisible();
 expect(writes).toBe(0);expect(errors).toEqual([]);const after=await (await request.get('/api/traffic/')).json();expect(after.totalViews).toBe(before.totalViews);
});

test('example and history labels stay distinct from the fresh zero baseline',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Show example visitors',exact:true}).click();
 await expect(page.locator('[data-provenance]')).toContainText('NOT REAL VISITORS');await expect(page.locator('[data-country]')).toHaveCount(9);
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.locator('[data-provenance]')).toContainText('SAMPLE HISTORY');await expect(page.locator('[data-country]')).toHaveCount(10);
});

test('atlas is usable without WebGL',async({page})=>{
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:any,...args:any[]){if(String(type).includes('webgl'))return null;return (get as any).apply(this,[type,...args]);} as any;});
 await page.goto('/');await page.getByRole('button',{name:'PC GLOBE',exact:true}).click();await page.locator('.pc-city-explorer').evaluate(e=>e.setAttribute('open',''));await page.locator('[data-atlas-search]').fill('Nairobi');await page.locator('[data-atlas-surprise]').click();await expect(page.locator('[data-atlas-detail]')).toContainText('Nairobi');await expect(page.locator('[data-atlas-learn]')).toHaveAttribute('href',/Nairobi/);
});

test('API outage leaves an honest status and a working atlas',async({page})=>{
 await page.route('**/api/traffic/**',r=>r.fulfill({status:503,body:'Unavailable'}));await page.goto('/');await expect(page.locator('[data-provenance]')).toContainText('UNAVAILABLE');await page.getByRole('button',{name:'PC GLOBE',exact:true}).click();await page.locator('.pc-city-explorer').evaluate(e=>e.setAttribute('open',''));await page.locator('[data-atlas-search]').fill('Brazil');await page.locator('[data-atlas-surprise]').click();await expect(page.locator('[data-atlas-detail]')).toContainText('Brazil');
});

test('mobile atlas fits and respects reduced motion',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('[data-control="motion"]')).toHaveAttribute('aria-label','Play globe rotation');await page.getByRole('button',{name:'PC GLOBE',exact:true}).click();await page.locator('.pc-city-explorer').evaluate(e=>e.setAttribute('open',''));await page.locator('[data-atlas-search]').fill('Tokyo');await page.locator('[data-atlas-surprise]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('embed never posts even when automation exclusion is disabled',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));let writes=0;page.on('request',r=>{if(r.method()==='POST')writes++;});await page.goto('/embed/');await expect(page.locator('[data-globe]')).toHaveClass(/has-webgl/);await page.getByRole('button',{name:'PC GLOBE',exact:true}).click();await page.locator('.pc-city-explorer').evaluate(e=>e.setAttribute('open',''));await page.locator('[data-atlas-surprise]').click();expect(writes).toBe(0);
});
