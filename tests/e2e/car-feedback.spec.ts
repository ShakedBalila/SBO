import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { createHash } from 'node:crypto';

test.use({ channel: 'msedge' });
test('car forms, tank limit and split-screen navigation', async ({ page }) => {
  test.setTimeout(180000);
  const browserErrors:string[]=[];
  page.on('pageerror',error=>browserErrors.push(error.message));
  page.on('console',message=>{const url=message.location().url;if(message.type()==='error'&&!url.includes('/api/calendar/holidays')&&!message.text().includes('favicon'))browserErrors.push(`${url}: ${message.text()}`);});
  const email=`car-feedback-${Date.now()}@example.test`;
  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  try {
    await page.goto('/login?mode=register');
    await page.getByLabel('שם',{exact:true}).fill('Car feedback');
    await page.getByLabel('כתובת אימייל').fill(email);
    await page.getByLabel('סיסמה').fill('Eight8!x');
    await page.getByRole('button',{name:'יצירת חשבון'}).click();
    await expect(page).toHaveURL('http://localhost:3000/');
    const response=await page.request.post('/api/modules/vehicles',{headers:{Origin:'http://localhost:3000'},data:{name:'Test car',year:2022,roadMonth:5,licensePlate:'123-45-678',odometerKm:100,fuelTankLiters:50}});
    expect(response.ok(),await response.text()).toBeTruthy();
    const vehicleId=(await db.query('SELECT v.id FROM "Vehicle" v JOIN "User" u ON u.id=v."userId" WHERE u.email=$1',[email])).rows[0].id;
    for(const liters of [50,50.01]){
      const result=await page.request.post('/api/modules/fuel',{headers:{Origin:'http://localhost:3000'},data:{vehicleId,date:'2026-09-14',estimatedRangeKm:500,actualDistanceKm:null,liters,pricePerLiter:7}});
      expect(result.status()).toBe(liters===50?201:400);
    }
    await page.goto('/car');
    await expect(page.getByRole('heading',{name:'Test car · 50L'})).toBeVisible();
    await page.getByRole('button',{name:'הוספת טסט',exact:true}).click();
    await page.getByLabel('אגרת טסט',{exact:true}).fill('123');
    await page.getByLabel('עלות הטסט',{exact:true}).fill('90');
    const saved=page.waitForResponse(r=>r.url().endsWith('/api/modules/reminders')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'שמירת רשומה'}).click();
    expect((await saved).ok()).toBeTruthy();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.getByRole('button',{name:'עריכת Test car',exact:true}).click();
    const digit=page.getByRole('textbox',{name:'ספרה 1 בלוחית הרישוי',exact:true});
    await digit.click();await digit.evaluate((el:HTMLInputElement)=>el.setSelectionRange(0,0));await digit.press('Backspace');await expect(digit).toHaveValue('');
    await digit.press('9');await expect(digit).toHaveValue('9');
    await page.mouse.click(2,2);await expect(page.locator('dialog[open]')).toHaveCount(0);
    for(const width of [320,375,430,507,650,768,834,900,1024,1440]){
      await page.setViewportSize({width,height:800});
      for(const route of ['/car','/tasks','/water','/nutrition','/']){
        await page.goto(route);
        if(route==='/car')await page.locator('.car-workspace:visible').waitFor();else await page.locator('main:visible').waitFor();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
      }
      await page.goto('/car');
      await page.locator('.car-workspace:visible').waitFor();
      if([430,507,834,1440].includes(width)){const browser=page.context().browser()!,state=await page.context().storageState(),context=await browser.newContext({storageState:state,viewport:{width,height:800}}),shot=await context.newPage();await shot.goto('http://localhost:3000/car');await shot.locator('.car-workspace:visible').waitFor();await shot.screenshot({path:`test-results/car-page-${width}.png`,fullPage:true});await context.close();}
      if(width<=900){
        await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
        const nav=await page.locator('.bottom-nav').boundingBox();
        expect(nav).not.toBeNull();expect(Math.abs(nav!.y+nav!.height-800)).toBeLessThan(2);
      }
      await page.getByRole('button',{name:'הוספת ביטוח',exact:true}).click();
      const controls=page.locator('dialog[open] .record-form-grid > label');
      const boxes=await controls.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,width:r.width};}));
      expect(Math.max(...boxes.map(b=>b.width))-Math.min(...boxes.map(b=>b.width))).toBeLessThan(2);
      await page.screenshot({path:`test-results/car-insurance-${width}.png`});
      await page.mouse.click(2,2);await expect(page.locator('dialog[open]')).toHaveCount(0);
    }
    await page.setViewportSize({width:430,height:932});await page.goto('/car');
    await page.getByRole('button',{name:/מחיר ממוצע לליטר/}).click();
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    await page.mouse.click(2,2);await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.getByRole('button',{name:'הוספת תדלוק',exact:true}).click();
    await expect(page.getByText('מרחק בפועל (ק״מ)',{exact:true})).toBeVisible();
    await expect(page.getByText('מרחק בפועל (ק״מ) (לא חובה)',{exact:true})).toHaveCount(0);
    await page.mouse.click(2,2);await expect(page.locator('dialog[open]')).toHaveCount(0);
    for(const label of ['הוספת טסט','הוספת ביטוח','הוספת טיפול']){await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('dialog[open]')).toHaveCount(1);await page.mouse.click(2,2);await expect(page.locator('dialog[open]')).toHaveCount(0);}
    await page.getByRole('button',{name:'מחיקת Test car',exact:true}).click();await expect(page.locator('dialog[open]')).toHaveCount(1);await page.mouse.click(2,2);await expect(page.locator('dialog[open]')).toHaveCount(0);
    const result=await page.request.post('/api/modules/expenses',{headers:{Origin:'http://localhost:3000'},data:{vehicleId,type:'Maintenance',title:'Oil',amount:100,date:'2026-09-14',nextServiceDate:'2027-09-14',reminderDays:7,reminderTime:'09:00',notes:''}});
    expect(result.ok(),await result.text()).toBeTruthy();
    expect((await db.query('SELECT e."reminderDays" FROM "VehicleExpense" e WHERE e."vehicleId"=$1',[vehicleId])).rows[0].reminderDays).toBe(7);
    expect(browserErrors).toEqual([]);
  } finally {
    await db.query('DELETE FROM "User" WHERE email=$1',[email]);
    await db.query('DELETE FROM "LoginAttempt" WHERE key=$1',[createHash('sha256').update(email).digest('hex')]);
    await db.end();
  }
});
