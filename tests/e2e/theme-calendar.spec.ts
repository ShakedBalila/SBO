import {test,expect} from '@playwright/test';
import {Client} from 'pg';
import {createHash} from 'node:crypto';

test('event range editing, completion, automatic targets and resize while scrolled',async({page})=>{
 test.setTimeout(120000);
 const email=`theme-${Date.now()}@example.test`,db=new Client({connectionString:process.env.DATABASE_URL}),headers={Origin:'http://localhost:3000'};
 await db.connect();
 try{
  await page.goto('/login?mode=register');await page.getByLabel('שם',{exact:true}).fill('בדיקת עיצוב');await page.getByLabel('כתובת אימייל').fill(email);await page.getByLabel('סיסמה').fill('Eight8!x');await page.getByRole('button',{name:'יצירת חשבון',exact:true}).click();await expect(page).toHaveURL('http://localhost:3000/');
  await page.goto('/tasks');await page.getByRole('button',{name:'יצירת אירוע',exact:true}).click();
  let dialog=page.locator('dialog[open]');await dialog.getByLabel('שם אירוע',{exact:true}).fill('חופשת סתיו');await dialog.getByLabel('תחילת אירוע',{exact:true}).fill('2026-09-17');await dialog.getByLabel('תאריך סיום אירוע',{exact:true}).fill('2026-09-22');
  for(const size of [{width:430,height:932},{width:834,height:1194},{width:507,height:834},{width:1440,height:1000}]){
   await page.setViewportSize(size);const start=await dialog.getByLabel('תחילת אירוע',{exact:true}).boundingBox(),end=await dialog.getByLabel('תאריך סיום אירוע',{exact:true}).boundingBox();expect(Math.abs(start!.y-end!.y)).toBeLessThan(2);expect(Math.abs(start!.width-end!.width)).toBeLessThan(2);expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();await page.screenshot({path:`test-results/event-theme-${size.width}.png`});
  }
  await dialog.getByRole('button',{name:'שמירת אירוע'}).click();await expect(dialog).toHaveCount(0);
  await expect(page.locator('.calendar-range-bar',{hasText:'חופשת סתיו'})).toHaveCount(2);
  await page.locator('.calendar-range-bar',{hasText:'חופשת סתיו'}).first().click();dialog=page.locator('dialog[open]');await expect(dialog.getByLabel('תאריך סיום אירוע',{exact:true})).toHaveValue('2026-09-22');await dialog.getByLabel('שם אירוע',{exact:true}).fill('חופשה מעודכנת');await dialog.getByRole('button',{name:'שמירת אירוע'}).click();
  const stored=await db.query('SELECT "endDate"::text AS "endDate" FROM "CalendarEvent" WHERE "userId"=(SELECT id FROM "User" WHERE email=$1)',[email]);expect(stored.rows[0].endDate.slice(0,10)).toBe('2026-09-22');
  expect((await page.request.post('/api/tasks',{headers,data:{title:'משימה להשלמה',priority:'HIGH'}})).ok()).toBeTruthy();await page.reload();await page.getByRole('button',{name:'סיום משימה להשלמה',exact:true}).click();await expect(page.locator('.completed-badge')).toHaveText('הושלם');
  await page.getByRole('button',{name:'יצירת משימה',exact:true}).click();
  for(const width of [430,507,834,1440]){await page.setViewportSize({width,height:932});expect(await page.locator('dialog[open]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();const emptySpace=await page.locator('dialog[open]').evaluate(el=>el.getBoundingClientRect().bottom-el.querySelector('form')!.getBoundingClientRect().bottom);expect(emptySpace).toBeLessThan(50);await page.screenshot({path:`test-results/task-theme-${width}.png`});}
  await page.locator('dialog[open]').getByRole('button',{name:'סגירה',exact:true}).click();
  for(const size of [{width:430,height:932},{width:834,height:1194},{width:1194,height:834},{width:507,height:834},{width:320,height:800},{width:1920,height:1080}]){
   await page.setViewportSize(size);await page.locator('.calendar-panel').scrollIntoViewIfNeeded();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   if(size.width<=1194){const bar=await page.locator('.bottom-nav').boundingBox();expect(Math.abs(bar!.y+bar!.height-size.height)).toBeLessThan(2);expect(await page.locator('main').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);}
   await page.screenshot({path:`test-results/calendar-theme-${size.width}.png`});
  }
  expect((await page.request.post('/api/modules/goals',{headers,data:{age:30,sex:'male',heightCm:180,weightKg:80,activityLevel:'moderate',weightGoal:'maintain',calorieGoal:999,proteinGoalG:1}})).ok()).toBeTruthy();
  await page.goto('/nutrition');await expect(page.locator('.module-stats')).toContainText('2,759');await expect(page.locator('input[name="calorieGoal"],input[name="proteinGoalG"]')).toHaveCount(0);
  await page.locator('input[name="weightKg"]').fill('85');await page.getByRole('button',{name:'חישוב אוטומטי ושמירה'}).click();await expect(page.locator('.module-stats')).toContainText('2,837');await expect(page.locator('.module-stats')).toContainText('136');await page.reload();await expect(page.locator('.module-stats')).toContainText('2,837');
  await page.route('**/api/nutrition/search?*',route=>route.fulfill({json:{foods:[{id:'12345678',name:'שווארמה עוף',source:'Open Food Facts',calories:180,proteinG:24,carbsG:3,fatG:8}]}}));
  await page.getByLabel('חיפוש במאגר המזון').fill('שווארמה');await page.getByRole('button',{name:'חיפוש',exact:true}).click();await page.locator('.food-grams input').fill('200');await page.locator('.food-results').getByRole('button',{name:/הוספה/}).click();dialog=page.locator('dialog[open]');await expect(dialog.getByLabel('קלוריות',{exact:true})).toHaveValue('360');await expect(dialog.getByLabel('חלבון (גרם)',{exact:true})).toHaveValue('48');
 }finally{await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.query('DELETE FROM "LoginAttempt" WHERE key=$1',[createHash('sha256').update(email).digest('hex')]);await db.end();}
});
