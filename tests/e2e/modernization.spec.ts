import {test,expect} from '@playwright/test';
import {Client} from 'pg';
test.use({channel:'msedge',viewport:{width:390,height:844}});
test('V3 mobile shell, utilities, reminders and vehicle fuel form',async({page})=>{
  const email=`v3-${Date.now()}@example.test`,db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  try{
    await page.goto('/login?mode=register');
    await page.getByLabel('שם',{exact:true}).fill('בדיקת V3');
    await page.getByLabel('כתובת אימייל').fill(email);
    await page.getByLabel('סיסמה').fill('Eight8!x');
    await page.getByRole('button',{name:'יצירת חשבון'}).click();
    await expect(page).toHaveURL('http://localhost:3000/');
    for(const route of ['/','/tasks','/water','/nutrition','/car','/settings','/data','/notifications','/help']){
      await page.goto(route);await expect(page.locator('main:visible').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBeTruthy();
    }
    await page.goto('/tasks');await page.getByRole('button',{name:/יצירת משימה/}).click();
    await expect(page.locator('.bottom-nav')).toBeHidden();
    const taskDialog=page.locator('.task-editor-modal:visible');
    await taskDialog.getByLabel(/שעת התראה/).fill('12:00');
    await taskDialog.getByLabel('שם משימה').fill('תזכורת מוקדמת');
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());
    const date=page.locator('.task-editor-modal input').filter({has:undefined}).nth(1);void date;
    await page.keyboard.press('Escape');
    const headers={Origin:'http://localhost:3000'};
    expect((await page.request.post('/api/modules/vehicles',{headers,data:{name:'Mazda 3',year:2024,roadMonth:5,licensePlate:'123-45-678',odometerKm:12000,fuelTankLiters:60}})).ok()).toBeTruthy();
    const vehicleId=(await db.query('SELECT v.id FROM "Vehicle" v JOIN "User" u ON u.id=v."userId" WHERE u.email=$1',[email])).rows[0].id;
    for(const type of ['Mandatory','Third party'])expect((await page.request.post('/api/modules/policies',{headers,data:{vehicleId,type,provider:'בדיקה',annualCost:1200,startDate:'2026-07-01',endDate:'2027-06-30',reminderDays:null,reminderTime:'09:00'}})).ok()).toBeTruthy();
    expect((await page.request.post('/api/modules/fuel',{headers,data:{vehicleId,date:'2026-09-20',currentOdometerKm:86000,liters:39.5,isFullTank:true,estimatedRangeKm:601,actualDistanceKm:null,pricePerLiter:7.2,customPricePerLiter:null,notes:''}})).ok()).toBeTruthy();
    expect((await page.request.post('/api/modules/fuel',{headers,data:{vehicleId,date:'2026-09-29',currentOdometerKm:86293,liters:31.5,isFullTank:true,estimatedRangeKm:526,actualDistanceKm:null,pricePerLiter:7.2,customPricePerLiter:6.5,notes:''}})).ok()).toBeTruthy();
    await page.goto('/car');await expect(page.locator('.vehicle-visual.photo img')).toHaveAttribute('src','/mazda-3-black.png');
    await expect(page.getByText(/9\.30 ק״מ\/ל׳/)).toBeVisible();
    expect(Number((await db.query('SELECT "totalCost" FROM "FuelEntry" WHERE "vehicleId"=$1 AND date=$2',[vehicleId,'2026-09-29'])).rows[0].totalCost)).toBe(204.75);
    const detailBoxes=await page.locator('.vehicles-panel .record-detail-grid>span').evaluateAll(items=>items.map(item=>({width:Math.round(item.getBoundingClientRect().width),top:Math.round(item.getBoundingClientRect().top)})));expect(new Set(detailBoxes.map(item=>item.width)).size).toBe(1);
    await page.locator('.vehicles-panel').scrollIntoViewIfNeeded();
    await page.screenshot({path:'test-results/v3-car-iphone-feedback.png',fullPage:true});
    await page.getByRole('button',{name:/הוספת תדלוק/}).click();
    const fuelDialog=page.locator('.fuel-entry-modal:visible');
    await expect(fuelDialog.getByLabel(/קילומטראז׳ נוכחי/)).toHaveAttribute('required','');
    await expect(fuelDialog.getByLabel(/מחיר לליטר בתחנה/)).not.toHaveAttribute('required','');
    await expect(fuelDialog.getByLabel(/האם המיכל מלא/)).toHaveAttribute('required','');
    await expect(fuelDialog.getByLabel(/הערות/)).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await fuelDialog.getByRole('button',{name:'סגירת הטופס'}).click();await expect(page.locator('.record-modal[open]')).toHaveCount(0);
    const manifest=await page.request.get('/manifest.webmanifest');expect(await manifest.text()).toContain('#121417');
    await page.goto('/nutrition');const creatineCard=page.locator('.creatine-card');await creatineCard.scrollIntoViewIfNeeded();const creatine=await creatineCard.boundingBox();expect(creatine?.width).toBeLessThanOrEqual(390);
    const creatineItems=await creatineCard.locator(':scope > *').evaluateAll(items=>items.map(item=>{const box=item.getBoundingClientRect();return {top:Math.round(box.top),bottom:Math.round(box.bottom),width:Math.round(box.width)}}));for(let index=1;index<creatineItems.length;index+=1)expect(creatineItems[index].top).toBeGreaterThanOrEqual(creatineItems[index-1].bottom-1);expect(creatineItems.every(item=>item.width<=Math.round(creatine!.width))).toBeTruthy();
    const timeBox=await creatineCard.locator('input[type="time"]').boundingBox();expect(timeBox!.x).toBeGreaterThanOrEqual(creatine!.x);expect(timeBox!.x+timeBox!.width).toBeLessThanOrEqual(creatine!.x+creatine!.width+1);
    await page.screenshot({path:'test-results/v3-nutrition-iphone-feedback.png',fullPage:true});
    await page.goto('/nutrition/foods');await page.getByRole('button',{name:/יצירת מזון/}).click();await page.route('**/api/nutrition/barcode/7290000000000',route=>route.fulfill({json:{code:'7290000000000',name:'מוצר מזוהה',brand:'מותג בדיקה',servingSize:'25 g',per100g:{calories:400,proteinG:20,carbsG:50,fatG:10}}}));await page.getByLabel(/ברקוד/).fill('7290000000000');await page.getByRole('button',{name:'זיהוי לפי ברקוד'}).click();await expect(page.getByLabel('שם המזון')).toHaveValue('מוצר מזוהה');await page.keyboard.press('Escape');
    await page.goto('/tasks');await expect(page.locator('.task-tabs')).toHaveCSS('border-top-color','rgb(138, 107, 22)');const outside=page.locator('.calendar-day.outside').first(),inside=page.locator('.calendar-day:not(.outside):not(.today)').first();await expect(outside).toHaveCSS('opacity','1');expect(await outside.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(await inside.evaluate(el=>getComputedStyle(el).backgroundColor));
    await page.goto('/');await expect(page.locator('.dashboard-agenda')).toHaveCount(0);await expect(page.locator('.today-counts:visible').first()).toBeVisible();await expect(page.locator('.dashboard-car-photo:visible').first()).toHaveAttribute('src','/mazda-3-black.png');
    for(const card of await page.locator('.overview-card:visible').all()){const media=await card.locator('.dashboard-art,.dashboard-car-photo').boundingBox(),content=await card.locator('.overview-content').boundingBox();expect(media!.x+media!.width).toBeLessThanOrEqual(content!.x+1);}
    const carCard=page.locator('.overview-car:visible').first(),expiries=carCard.locator('.vehicle-expiries');const carBox=await carCard.boundingBox(),expiryBox=await expiries.boundingBox();expect(expiryBox!.y+expiryBox!.height).toBeLessThanOrEqual(carBox!.y+carBox!.height+1);await expect(expiries.locator('span')).toHaveCount(4);
    const policyDates=await expiries.locator('span').filter({hasText:/ביטוח (חובה|צד ג׳)/}).locator('strong').allTextContents();expect(policyDates[0]).toBe(policyDates[1]);
    await page.screenshot({path:'test-results/v3-iphone-feedback.png',fullPage:true});
    const offline=await page.request.get('/offline');expect(offline.ok()).toBeTruthy();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }finally{await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}
});
