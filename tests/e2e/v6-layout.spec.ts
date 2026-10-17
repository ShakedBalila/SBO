import {test,expect} from '@playwright/test';
import {Client} from 'pg';
import {registerInvited} from './invitation-fixture';
test('V6 settings, overview media and adaptive navigation on phones, split screen and desktop',async({page})=>{
 test.setTimeout(180000);page.setDefaultTimeout(8000);const email=`v6-layout-${Date.now()}@example.test`,headers={Origin:'http://localhost:3000'},db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  expect((await registerInvited(page.request,{headers,data:{name:'בדיקת תצוגה',email,password:'V6 layout test 2026!'}})).ok()).toBeTruthy();
  await page.request.post('/api/modules/vehicles',{headers,data:{name:'MAZDA 3',year:2024,roadMonth:5,licensePlate:'123-45-678',odometerKm:1000,fuelTankLiters:60}});
  const counts:number[]=[];
  for(const width of [320,360,375,390,430,597,834,1024,1194,1440]){
   await page.setViewportSize({width,height:900});await page.goto('/');await expect(page.locator('.overview-card')).toHaveCount(6);
   for(const card of await page.locator('.overview-card').all()){const geometry=await card.evaluate(el=>{const c=el.getBoundingClientRect(),h=el.querySelector('h2')!.getBoundingClientRect(),image=el.querySelector('.card-image-layer')!.getBoundingClientRect(),content=el.querySelector('.overview-content')!.getBoundingClientRect();return {headingCenter:(h.left+h.right)/2,center:(c.left+c.right)/2,overlap:image.right-content.left};});expect(Math.abs(geometry.headingCenter-geometry.center)).toBeLessThan(1);expect(geometry.overlap).toBeLessThanOrEqual(1);}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   if(width<1194){await expect.poll(()=>page.locator('.bottom-nav>a').count()).toBeGreaterThan(1);counts.push(await page.locator('.bottom-nav>a').count());const nav=await page.locator('.bottom-nav').boundingBox();expect(Math.abs(nav!.y+nav!.height-900)).toBeLessThan(2);for(const target of await page.locator('.bottom-nav>a,.bottom-nav>button').all())expect((await target.boundingBox())!.width).toBeGreaterThanOrEqual(44);}
   if(width===390)console.log('car-media',await page.locator('.overview-car .card-image-layer img').evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,fit:s.objectFit,pos:s.objectPosition,transform:s.transform,mask:s.maskImage};}));await page.screenshot({path:`test-results/v6-overview-${width}.png`});
   await page.goto('/settings/profile');await expect(page.getByLabel('שם תצוגה',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`test-results/v6-settings-${width}.png`,fullPage:true});
  }
  expect(counts[0]).toBeLessThan(counts[counts.length-1]);
  await page.setViewportSize({width:390,height:844});await page.goto('/settings/profile');await page.getByLabel('שם פרטי',{exact:true}).fill('בדיקה');await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByRole('status')).toContainText('הפרופיל נשמר');await page.reload();await expect(page.getByLabel('שם פרטי',{exact:true})).toHaveValue('בדיקה');
  await page.goto('/settings/preferences');await page.getByLabel('גודל טקסט').selectOption('200');await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByRole('status')).toContainText('השינויים נשמרו');await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'test-results/v6-overview-text200.png',fullPage:true});
  await page.goto('/settings/notifications');await expect(page.getByRole('switch',{name:'התראות בחשבון'})).toBeVisible();await page.getByRole('switch',{name:'התראות בחשבון'}).uncheck();await expect(page.getByRole('status').last()).toContainText('נשמרו');await page.reload();await expect(page.getByRole('switch',{name:'התראות בחשבון'})).not.toBeChecked();
  expect(errors).toEqual([]);
 }finally{await db.query('DELETE FROM "Invitation" WHERE email=$1',[email]);await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}
});
