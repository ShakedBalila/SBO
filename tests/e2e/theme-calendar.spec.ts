import {test,expect} from '@playwright/test';
import {Client} from 'pg';
import {createHash} from 'node:crypto';

test('event range editing, completion, automatic targets and resize while scrolled',async({page})=>{
 test.setTimeout(120000);
 const email=`theme-${Date.now()}@example.test`,db=new Client({connectionString:process.env.DATABASE_URL}),headers={Origin:'http://localhost:3000'};
 await db.connect();const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date()).slice(0,7),day=1+(4-new Date(`${month}-01T00:00:00Z`).getUTCDay()+7)%7,startDate=`${month}-${String(day).padStart(2,'0')}`,endDate=`${month}-${String(day+5).padStart(2,'0')}`;
 try{
  await page.goto('/login?mode=register');await page.getByLabel('שם',{exact:true}).fill('בדיקת עיצוב');await page.getByLabel('כתובת אימייל').fill(email);await page.getByLabel('סיסמה').fill('TwelveEnough12!');await page.getByRole('button',{name:'יצירת חשבון',exact:true}).click();await expect(page).toHaveURL('http://localhost:3000/');
  await page.goto('/tasks');await page.getByRole('button',{name:'יצירת אירוע',exact:true}).click();
  let dialog=page.locator('dialog[open]');await dialog.getByLabel('שם אירוע',{exact:true}).fill('חופשת סתיו');await dialog.getByLabel('תחילת אירוע',{exact:true}).fill(startDate);await dialog.getByLabel('תאריך סיום אירוע',{exact:true}).fill(endDate);await dialog.getByRole('button',{name:'ורוד',exact:true}).click();const previewColor=await dialog.locator('.event-color-calendar-preview .event-item').evaluate(el=>getComputedStyle(el).backgroundColor);
  for(const size of [{width:430,height:932},{width:834,height:1194},{width:507,height:834},{width:1440,height:1000}]){
   await page.setViewportSize(size);const start=await dialog.getByLabel('תחילת אירוע',{exact:true}).boundingBox(),end=await dialog.getByLabel('תאריך סיום אירוע',{exact:true}).boundingBox();expect(Math.abs(start!.y-end!.y)).toBeLessThan(2);expect(Math.abs(start!.width-end!.width)).toBeLessThan(2);expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();await page.screenshot({path:`test-results/event-theme-${size.width}.png`});
  }
  await dialog.getByRole('button',{name:'שמירת אירוע'}).click();await expect(dialog).toHaveCount(0);
  await expect(page.locator('.calendar-range-bar',{hasText:'חופשת סתיו'})).toHaveCount(2);expect(await page.locator('.calendar-range-bar',{hasText:'חופשת סתיו'}).first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(previewColor);
  await page.locator('.calendar-range-bar',{hasText:'חופשת סתיו'}).first().click();dialog=page.locator('dialog[open]');await expect(dialog.getByLabel('תאריך סיום אירוע',{exact:true})).toHaveValue(endDate);await dialog.getByLabel('שם אירוע',{exact:true}).fill('חופשה מעודכנת');await dialog.getByRole('button',{name:'שמירת אירוע'}).click();
  const stored=await db.query('SELECT "endDate"::text AS "endDate" FROM "CalendarEvent" WHERE "userId"=(SELECT id FROM "User" WHERE email=$1)',[email]);expect(stored.rows[0].endDate.slice(0,10)).toBe(endDate);
  expect((await page.request.post('/api/tasks',{headers,data:{title:'משימה להשלמה',priority:'HIGH'}})).ok()).toBeTruthy();await page.reload();await page.getByRole('button',{name:'סיום משימה להשלמה',exact:true}).click();await page.getByRole('button',{name:'משימות שהסתיימו',exact:true}).click();await expect(page.locator('.completed-badge')).toHaveText('הושלם');
  await page.getByRole('button',{name:'יצירת משימה',exact:true}).click();
  for(const width of [430,507,834,1440]){await page.setViewportSize({width,height:932});expect(await page.locator('dialog[open]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();const emptySpace=await page.locator('dialog[open]').evaluate(el=>el.getBoundingClientRect().bottom-el.querySelector('form')!.getBoundingClientRect().bottom);expect(emptySpace).toBeLessThan(50);await page.screenshot({path:`test-results/task-theme-${width}.png`});}
  dialog=page.locator('.task-editor-modal[open]');await dialog.getByLabel('שם משימה',{exact:true}).fill('תזכורת מדויקת');await dialog.getByLabel('תאריך המשימה',{exact:true}).fill(startDate);await dialog.getByLabel('שעת התראה',{exact:true}).fill('09:00');await dialog.getByRole('button',{name:'שמירה',exact:true}).click();await expect(dialog).toHaveCount(0);const reminder=await db.query('SELECT "reminderMinutes" FROM "Task" WHERE title=$1 AND "userId"=(SELECT id FROM "User" WHERE email=$2)',['תזכורת מדויקת',email]);expect(reminder.rows[0].reminderMinutes).toBe(0);
  for(const size of [{width:430,height:932},{width:834,height:1194},{width:1194,height:834},{width:507,height:834},{width:320,height:800},{width:1920,height:1080}]){
   await page.setViewportSize(size);await page.locator('.calendar-panel').scrollIntoViewIfNeeded();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   if(size.width<=1194){const bar=await page.locator('.bottom-nav').boundingBox();expect(Math.abs(bar!.y+bar!.height-size.height)).toBeLessThan(2);expect(await page.locator('main').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);}
   await page.screenshot({path:`test-results/calendar-theme-${size.width}.png`});
  }
  expect((await page.request.post('/api/modules/goals',{headers,data:{age:30,sex:'male',heightCm:180,weightKg:80,weeklyWorkouts:3,weightGoal:'maintain',nutritionGoalMode:'auto'}})).ok()).toBeTruthy();
  await page.goto('/nutrition');await expect(page.locator('.nutrition-summary')).toContainText('2,670');await page.getByRole('button',{name:'יעדים',exact:true}).click();dialog=page.locator('.nutrition-goals-modal[open]');await dialog.locator('input[name="weightKg"]').fill('85');await dialog.getByRole('button',{name:'שמירת יעדים',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.locator('.nutrition-summary')).toContainText('2,745');await expect(page.locator('.nutrition-summary')).toContainText('136');await page.reload();await expect(page.locator('.nutrition-summary')).toContainText('2,745');
  await page.route('**/api/nutrition/search?*',route=>route.fulfill({json:{foods:[{id:'12345678',name:'שווארמה עוף',source:'Open Food Facts',calories:180,proteinG:24,carbsG:3,fatG:8}]}}));
  await page.getByRole('button',{name:'הוספת מזון',exact:true}).click();dialog=page.locator('.nutrition-add-modal[open]');await dialog.getByRole('textbox',{name:'חיפוש מזון'}).fill('שווארמה');await dialog.locator('.food-result-main').click();await dialog.getByLabel('כמות שאכלת (גרם)',{exact:true}).fill('200');await expect(dialog.locator('.nutrition-preview')).toContainText('360');await expect(dialog.locator('.nutrition-preview')).toContainText('48');

 }finally{await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.query('DELETE FROM "LoginAttempt" WHERE key=$1',[createHash('sha256').update(email).digest('hex')]);await db.end();}
});
