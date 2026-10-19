import {test,expect} from '@playwright/test';
import {Client} from 'pg';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {registerInvited} from './invitation-fixture';

const dir='.tools/dashboard-card-zones';
test('shared mobile card zones preserve stored data, card dimensions, navigation and desktop pixels',async({browser})=>{
 test.setTimeout(180000);
 if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))throw Error('Local fixture only');
 const phase=process.env.SBO_CARD_LAYOUT_PHASE,before=phase==='before',compare=phase==='after',db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();await mkdir(dir,{recursive:true});
 const context=await browser.newContext({baseURL:'http://localhost:3000',reducedMotion:'reduce',...(!compare?{}:{storageState:JSON.parse(await readFile(`${dir}/session.json`,'utf8'))})}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));let email='';
 try{
  if(!compare){
   email=`card-zones-${Date.now()}@example.test`;const headers={Origin:'http://localhost:3000'};
   expect((await registerInvited(context.request,{headers,data:{email,name:'בדיקת פריסה',password:'Dashboard fixture 2026!'}})).ok()).toBeTruthy();
   const userId=(await db.query('SELECT id FROM "User" WHERE email=$1',[email])).rows[0].id;
   await db.query('UPDATE "UserSettings" SET "waterGoalMl"=2000,"calorieGoal"=2200,"proteinGoalG"=140 WHERE "userId"=$1',[userId]);
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());
   for(const [path,data] of [
    ['/api/modules/vehicles',{name:'MAZDA 3',year:2018,roadMonth:3,licensePlate:'305-93-001',odometerKm:86000,fuelTankLiters:51}],
    ['/api/modules/water',{date,amountMl:1200}],
    ['/api/modules/nutrition',{date,name:'ארוחה שנשמרה',calories:1650,proteinG:105,carbsG:160,fatG:50}],
    ['/api/tasks',{title:'משימה להיום',startDate:date}],
    ['/api/modules/events',{title:'אירוע להיום',date}],
    ['/api/work/entries',{date,type:'WORK',startTime:'08:00',endTime:'16:30',endDate:date,breakMinutes:30,overtimeApproved:false,distanceKm:0,tripId:null,notes:''}]
   ] as const){const r=await context.request.post(path,{headers,data});expect(r.ok(),`${path}: ${await r.text()}`).toBe(true);}
   if(before){await writeFile(`${dir}/fixture.json`,JSON.stringify({email}));await context.storageState({path:`${dir}/session.json`});}
  }else email=JSON.parse(await readFile(`${dir}/fixture.json`,'utf8')).email;
  for(const width of [320,375,390,430,1440]){
   await page.setViewportSize({width,height:width===1440?900:844});await page.goto('/');await expect(page.locator('.overview-card')).toHaveCount(6);await expect(page.locator('html')).toHaveAttribute('data-text-scale','100');await expect(page.locator('.overview-card').first()).toBeVisible();await page.waitForLoadState('networkidle');
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll<HTMLImageElement>('.overview-card img')].map(async img=>{img.loading='eager';await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error(`Image did not load: ${img.getAttribute('src')}`)),10000))]);}));});await page.mouse.move(0,0);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const snapshot=await page.locator('.overview-card').evaluateAll(cards=>cards.map(card=>{
    const box=(el:Element)=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const title=card.querySelector('h2')!,media=card.querySelector('.card-image-layer')!,content=card.querySelector('.overview-content')!,cs=getComputedStyle(card);
    return {className:card.className,href:card.getAttribute('href'),text:card.textContent,rect:box(card),title:box(title),media:box(media),content:box(content),border:cs.border,borderRadius:cs.borderRadius,overflow:cs.overflow,mediaSrc:card.querySelector('img')!.getAttribute('src'),image:box(card.querySelector('img')!),fit:getComputedStyle(card.querySelector('img')!).objectFit,layers:[...media.querySelectorAll('.card-overlay-layer,.card-gradient-fade')].map(box),items:[...content.children].filter(el=>el.tagName!=='H2').map(box)};
   }));
   const nav=await page.locator('.bottom-nav').evaluate(el=>({text:el.textContent,style:getComputedStyle(el).cssText,rect:{x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}}));
   const png=await page.screenshot({path:`${dir}/${before?'before':'after'}-${width}.png`,fullPage:true});
   if(before){await writeFile(`${dir}/before-${width}.json`,JSON.stringify({snapshot,nav},null,2));continue;}
   const baseline=compare?JSON.parse(await readFile(`${dir}/before-${width}.json`,'utf8')):null;
   if(baseline)expect(nav).toEqual(baseline.nav);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(width===1440){if(baseline){expect(snapshot).toEqual(baseline.snapshot);expect(png.equals(await readFile(`${dir}/before-${width}.png`))).toBe(true);}else await expect(page.locator('.overview-card').first()).toHaveCSS('display','block');continue;}
   expect(await page.locator('.dashboard-stack').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
   for(const [index,card] of snapshot.entries()){
    const original=baseline?.snapshot[index];if(original){expect(card.rect).toEqual(original.rect);expect(card.href).toBe(original.href);expect(card.className).toBe(original.className);expect(card.text).toBe(original.text);expect(card.mediaSrc).toBe(original.mediaSrc);expect(card.border).toBe(original.border);expect(card.borderRadius).toBe(original.borderRadius);}
    expect(Math.abs(card.title.x+card.title.width/2-card.rect.x-card.rect.width/2)).toBeLessThan(1);
    expect(card.title.bottom+5).toBeLessThanOrEqual(card.media.y);expect(card.content.y).toBeGreaterThanOrEqual(card.title.bottom+5);
    expect(card.media.x).toBeGreaterThanOrEqual(card.rect.x+1);expect(card.media.bottom).toBeLessThanOrEqual(card.rect.bottom-1);expect(card.media.right+5).toBeLessThanOrEqual(card.content.x);
    expect(card.content.right).toBeLessThanOrEqual(card.rect.right-1);expect(card.content.bottom).toBeLessThanOrEqual(card.rect.bottom-1);
    expect(card.fit).toBe('cover');expect(card.image).toEqual(card.media);expect(card.overflow).toBe('hidden');
    for(const layer of card.layers){expect(layer.y).toBeGreaterThanOrEqual(card.media.y);expect(layer.bottom).toBeLessThanOrEqual(card.media.bottom);expect(layer.right).toBeLessThanOrEqual(card.media.right);}
    for(const item of card.items){expect(item.x).toBeGreaterThanOrEqual(card.content.x-1);expect(item.right).toBeLessThanOrEqual(card.content.right+1);expect(item.y).toBeGreaterThanOrEqual(card.content.y-1);expect(item.bottom).toBeLessThanOrEqual(card.content.bottom+1);}
   }
   for(let index=0;index<6;index+=2)expect(snapshot[index].rect.height).toBe(snapshot[index+1].rect.height);
   await expect(page.locator('.overview-water')).toContainText('60%');await expect(page.locator('.overview-nutrition')).toContainText('1,650');await expect(page.locator('.overview-nutrition')).toContainText('105');await expect(page.locator('.overview-car')).toContainText('305-93-001');
  }
  expect(errors).toEqual([]);
  if(!before){await page.setViewportSize({width:390,height:844});for(const route of ['/tasks','/work','/water','/nutrition','/car','/workouts']){await page.goto('/');await page.locator(`.overview-card[href="${route}"]`).click();await expect(page).toHaveURL(`http://localhost:3000${route}`);}}
 }finally{await context.close();if(!before&&email){await db.query('DELETE FROM "Invitation" WHERE email=$1',[email]);await db.query('DELETE FROM "User" WHERE email=$1',[email]);}await db.end();}
});
