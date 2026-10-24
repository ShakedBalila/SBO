import {test,expect} from '@playwright/test';
import {Client} from 'pg';
import {readFileSync,mkdirSync} from 'node:fs';
import {registerInvited} from './invitation-fixture';
const headers={Origin:'http://localhost:3000'},password='Audit fixes 2026!',dir='.tools/audit-fixes';

async function fixture(page:any){
 const url=new URL(process.env.DATABASE_URL!);if(!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Local audit fixes only');
 const db=new Client({connectionString:url.toString()});await db.connect();const email=`audit-fix-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
 expect((await registerInvited(page.request,{headers,data:{email,password,name:'בדיקת תיקונים'}})).ok()).toBeTruthy();
 return {db,email,async cleanup(){await db.query('DELETE FROM "Invitation" WHERE email=$1',[email]);await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}};
}

test('barcode uses owned food and failed saves preserve quantity for one successful retry',async({page,browser})=>{
 test.setTimeout(90000);mkdirSync(dir,{recursive:true});const f=await fixture(page);let other:any;
 try{
  const code='7290000000001';
  expect((await page.request.post('/api/nutrition/foods',{headers,data:{name:'מזון אישי לברקוד',barcode:code,caloriesPer100:120,proteinPer100G:10,carbsPer100G:15,fatPer100G:2,servingGrams:100}})).ok()).toBeTruthy();
  const own=await(await page.request.get('/api/nutrition/barcode/'+code)).json();expect(own).toMatchObject({name:'מזון אישי לברקוד',source:'המאגר האישי שלי',per100g:{calories:120}});expect(own.foodKey).toMatch(/^user:/);
  other=await browser.newContext({baseURL:'http://localhost:3000'});const p=await other.newPage(),g=await fixture(p);
  try{await p.request.post('/api/nutrition/foods',{headers,data:{name:'ברקוד של משתמש אחר',barcode:code,caloriesPer100:200,proteinPer100G:20,carbsPer100G:20,fatPer100G:3}});expect(await(await p.request.get('/api/nutrition/barcode/'+code)).json()).toMatchObject({name:'ברקוד של משתמש אחר'});expect(await(await page.request.get('/api/nutrition/barcode/'+code)).json()).toMatchObject({name:'מזון אישי לברקוד'});}finally{await g.cleanup();await other.close();other=null;}
  await page.setViewportSize({width:390,height:844});await page.goto('/nutrition');await page.getByRole('button',{name:'פתיחת סורק',exact:true}).click();const modal=page.locator('.scanner-modal[open]');await modal.getByLabel('מספר ברקוד').fill(code);await modal.getByRole('button',{name:'זיהוי והמשך',exact:true}).click();await modal.getByRole('button',{name:'לפי גרמים',exact:true}).click();await modal.getByLabel('כמות בגרמים').fill('250');
  let posts=0;await page.route('**/api/modules/nutrition',async r=>{if(r.request().method()!=='POST')return r.continue();posts++;if(posts===1)return r.fulfill({status:503,json:{error:'לא ניתן לשמור כרגע. נסה שוב.'}});await new Promise(resolve=>setTimeout(resolve,300));return r.continue();});
  await modal.getByRole('button',{name:'הוספה ליומן',exact:true}).click();await expect(modal.getByRole('alert')).toContainText('נסה שוב');await expect(modal.getByLabel('כמות בגרמים')).toHaveValue('250');await expect(modal).toContainText('מזון אישי לברקוד');await page.screenshot({path:dir+'/barcode-retry-390.png'});
  await modal.getByRole('button',{name:'הוספה ליומן',exact:true}).click();await expect(modal.getByRole('button',{name:'שומר…',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(modal).toBeVisible();await expect(modal).toHaveCount(0);expect(posts).toBe(2);
  const rows=(await f.db.query('SELECT n.quantity,n.calories,n.source FROM "NutritionEntry" n JOIN "User" u ON u.id=n."userId" WHERE u.email=$1',[f.email])).rows;expect(rows).toHaveLength(1);expect(Number(rows[0].quantity)).toBe(250);expect(rows[0].calories).toBe(300);expect(rows[0].source).toBe('המאגר האישי שלי');
 }finally{await other?.close();await f.cleanup();}
});

test('profile saves text and image atomically and invalid text focuses a Hebrew error',async({page})=>{
 test.setTimeout(90000);const f=await fixture(page),png=readFileSync('public/sbo-icon-192.png');
 try{
  let r=await page.request.post('/api/account/profile',{headers,multipart:{name:'   ',firstName:'',lastName:'',phone:'',file:{name:'test.png',mimeType:'image/png',buffer:png}}});expect(r.status()).toBe(400);expect(await r.json()).toMatchObject({error:'יש להזין שם תצוגה.',field:'name'});expect(await(await page.request.get('/api/account/profile')).json()).toMatchObject({avatar:false,name:'בדיקת תיקונים'});
  r=await page.request.post('/api/account/profile',{headers,multipart:{name:'שם שלא יישמר',firstName:'',lastName:'',phone:'',file:{name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not a valid image')}}});expect(r.status()).toBe(400);expect(await(await page.request.get('/api/account/profile')).json()).toMatchObject({avatar:false,name:'בדיקת תיקונים'});
  await page.setViewportSize({width:390,height:844});await page.goto('/settings/profile');await page.getByLabel('תמונת פרופיל',{exact:true}).setInputFiles('public/sbo-icon-192.png');await page.getByLabel('שם תצוגה',{exact:true}).fill('   ');await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByLabel('שם תצוגה',{exact:true})).toBeFocused();await expect(page.getByLabel('שם תצוגה',{exact:true})).toHaveAttribute('aria-invalid','true');await expect(page.locator('#profile-name-error')).toHaveText('יש להזין שם תצוגה.');expect((await(await page.request.get('/api/account/profile')).json()).avatar).toBe(false);
  await page.getByLabel('שם תצוגה',{exact:true}).fill('שם שנשמר יחד');let posts=0;await page.route('**/api/account/profile',r=>{if(r.request().method()!=='POST')return r.continue();posts++;return posts===1?r.fulfill({status:503,json:{error:'לא ניתן לשמור כרגע.'}}):r.continue();});
  await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByRole('status')).toContainText('לא ניתן לשמור');expect(await(await page.request.get('/api/account/profile')).json()).toMatchObject({avatar:false,name:'בדיקת תיקונים'});await expect(page.getByAltText('תצוגה מקדימה לחיתוך')).toBeVisible();await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByRole('status')).toContainText('הפרופיל נשמר');expect(await(await page.request.get('/api/account/profile')).json()).toMatchObject({avatar:true,name:'שם שנשמר יחד'});
 }finally{await f.cleanup();}
});

test('nutrition goals discard unsaved edits on cancel, X, Escape and backdrop',async({page})=>{
 test.setTimeout(90000);const f=await fixture(page);
 try{
  await page.setViewportSize({width:390,height:844});await page.goto('/nutrition');
  for(const close of ['cancel','x','escape','backdrop']){
   await page.getByRole('button',{name:'יעדים',exact:true}).click();const modal=page.locator('.nutrition-goals-modal[open]');await expect(modal.getByLabel('גיל',{exact:true})).toHaveValue('');await expect(modal.getByLabel('יעד קלוריות',{exact:true})).toHaveCount(0);await modal.getByLabel('גיל',{exact:true}).fill('99');await modal.getByRole('button',{name:'שינוי ידני',exact:true}).click();
   if(close==='cancel')await modal.getByRole('button',{name:'ביטול',exact:true}).click();else if(close==='x')await modal.getByRole('button',{name:'סגירה',exact:true}).click();else if(close==='escape')await page.keyboard.press('Escape');else await page.mouse.click(2,2);await expect(modal).toHaveCount(0);
  }
  await page.getByRole('button',{name:'יעדים',exact:true}).click();const modal=page.locator('.nutrition-goals-modal[open]');await modal.getByRole('button',{name:'שינוי ידני',exact:true}).click();await modal.getByLabel('גיל',{exact:true}).fill('30');await modal.getByLabel('יעד קלוריות',{exact:true}).fill('2200');await modal.getByLabel('יעד חלבון (גרם)',{exact:true}).fill('140');await modal.getByRole('button',{name:'שמירת יעדים',exact:true}).click();await expect(modal).toHaveCount(0);await page.reload();await page.getByRole('button',{name:'יעדים',exact:true}).click();await expect(modal.getByLabel('גיל',{exact:true})).toHaveValue('30');await expect(modal.getByLabel('יעד קלוריות',{exact:true})).toHaveValue('2200');
 }finally{await f.cleanup();}
});

test('readable dates, distinct notification states and contained cards at 100–200% text',async({page})=>{
 test.setTimeout(180000);mkdirSync(dir,{recursive:true});const f=await fixture(page);
 try{
  await page.request.post('/api/modules/vehicles',{headers,data:{name:'MAZDA 3',year:2018,roadMonth:3,licensePlate:'305-93-001',odometerKm:86000,fuelTankLiters:51}});
  for(const scale of [100,125,150,200]){
   expect((await page.request.post('/api/account/preferences',{headers,data:{textScale:scale,reducedMotion:true}})).ok()).toBeTruthy();
   for(const width of scale===100?[320,375,390,430,597,834,1440]:[320,390,597,1440]){
    await page.setViewportSize({width,height:844});await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-text-scale',String(scale));await expect(page.locator('.overview-card')).toHaveCount(6);await page.waitForLoadState('networkidle');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const cards=await page.locator('.overview-card').evaluateAll(nodes=>nodes.map(card=>{const box=card.getBoundingClientRect(),h=card.querySelector('h2')!.getBoundingClientRect(),m=card.querySelector('.card-image-layer')!.getBoundingClientRect(),c=card.querySelector('.overview-content')!.getBoundingClientRect();return {title:card.querySelector('h2')!.textContent,box:{l:box.left,r:box.right,b:box.bottom},h:{b:h.bottom},m:{t:m.top,r:m.right,b:m.bottom},c:{l:c.left,b:c.bottom},items:[...card.querySelector('.overview-content')!.children].filter(el=>el.tagName!=='H2').map(el=>{const b=el.getBoundingClientRect();return {text:el.textContent,l:b.left,r:b.right,b:b.bottom};})};}));
    for(const card of cards){expect(card.m.t,`${scale}/${width} ${card.title} header`).toBeGreaterThanOrEqual(card.h.b);expect(card.m.b).toBeLessThanOrEqual(card.box.b);expect(card.m.r).toBeLessThanOrEqual(card.c.l+1);for(const item of card.items){expect(item.l,`${scale}/${width} ${card.title}: ${item.text}`).toBeGreaterThanOrEqual(card.box.l);expect(item.r).toBeLessThanOrEqual(card.box.r+1);expect(item.b,`${scale}/${width} ${card.title}: ${item.text}`).toBeLessThanOrEqual(card.box.b+1);}}
    if(width<=597){await page.locator('.workspace').evaluate(el=>el.scrollTop=el.scrollHeight);const nav=(await page.locator('.bottom-nav').boundingBox())!;expect(Math.abs(nav.y+nav.height-844)).toBeLessThan(2);}
    if([320,390,1440].includes(width)&&[100,200].includes(scale)){await page.locator('.workspace').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`${dir}/overview-${width}-text${scale}.png`});}
   }
  }
  await page.request.post('/api/account/preferences',{headers,data:{textScale:100,reducedMotion:true}});
  for(const width of [320,390,597,1440]){await page.setViewportSize({width,height:844});await page.goto('/workouts');const input=page.getByLabel('תאריך בלוח האימונים',{exact:true});await input.fill('2026-10-24');await expect(input).toHaveValue('2026-10-24');await expect(input.locator('..')).toContainText('24/10/2026');const box=(await input.locator('..').boundingBox())!;expect(box.width).toBeGreaterThan(120);await input.scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/workout-date-${width}.png`});}
  await page.goto('/notifications');await expect(page.getByRole('heading',{name:'חיבור המכשיר הזה'})).toBeVisible();await expect(page.getByRole('heading',{name:'התראות בחשבון'})).toBeVisible();const master=page.getByRole('switch',{name:'התראות בחשבון'});await master.uncheck();await expect(page.locator('.notification-account-state')).toContainText('כבויות');await page.reload();await expect(master).not.toBeChecked();await master.check();await expect(page.locator('.notification-account-state')).toContainText('מופעלות');await page.screenshot({path:dir+'/notification-states.png'});
 }finally{await f.cleanup();}
});
