import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
const email = `sbo-feedback-${Date.now()}@example.test`;
const password = 'Eight8!x';
const lan = process.env.TEST_APP_URL ?? 'http://localhost:3000';
const origin = { Origin: lan };
test.afterAll(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect();
  await client.query('DELETE FROM "User" WHERE email=$1',[email]);
  await client.query('DELETE FROM "LoginAttempt" WHERE key=$1',[createHash('sha256').update(email).digest('hex')]); await client.end();
});
test('native login, eight-character password and module persistence', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled:false, viewport:{width:390,height:844} });
  const page = await context.newPage();
  await page.goto(`${lan}/login?mode=register`);
  await page.getByLabel('שם',{exact:true}).fill('Mobile User'); await page.getByLabel('כתובת אימייל').fill(email); await page.getByLabel('סיסמה').fill(password);
  await page.getByRole('button',{name:'יצירת חשבון'}).click(); await expect(page).toHaveURL(`${lan}/`); await expect(page.getByRole('button',{name:'התנתקות'})).toBeVisible();
  await context.close();

  const wrong = await browser.newContext({javaScriptEnabled:false}); const wrongPage=await wrong.newPage();
  await wrongPage.goto(`${lan}/login`); await wrongPage.getByLabel('כתובת אימייל').fill('unknown@example.test'); await wrongPage.getByLabel('סיסמה').fill('badpass1'); await wrongPage.getByRole('button',{name:'התחברות'}).click();
  await expect(wrongPage).toHaveURL(/\/login\?error=/); await expect(wrongPage.getByRole('heading',{name:'טוב שחזרת.'})).toBeVisible(); await expect(wrongPage.getByRole('alert')).toContainText('שגויים'); await wrong.close();

  const app = await browser.newContext({viewport:{width:1440,height:1000}}); const appPage=await app.newPage();
  await appPage.goto(`${lan}/login`); await appPage.getByLabel('כתובת אימייל').fill(email); await appPage.getByLabel('סיסמה').fill(password); await appPage.getByRole('button',{name:'התחברות'}).click();
  const api=appPage.request;
  for(const [path,data] of [
    ['goals',{waterGoalMl:2500,calorieGoal:2200,proteinGoalG:160}],['water',{amountMl:500,date:'2026-09-11'}],
    ['nutrition',{name:'Chicken bowl',meal:'Lunch',calories:650,proteinG:55,date:'2026-09-11'}],
    ['events',{title:'Workout',type:'Workout',date:'2026-09-12',notes:''}]
  ] as const) expect((await api.post(`${lan}/api/modules/${path}`,{headers:origin,data})).ok()).toBe(true);
  const vehicleResponse=await api.post(`${lan}/api/modules/vehicles`,{headers:origin,data:{name:'My car',licensePlate:'12-345-67',year:2022,odometerKm:45000,fuelTankLiters:50}}); expect(vehicleResponse.ok()).toBe(true);
  const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();const vehicleId=(await client.query('SELECT v.id FROM "Vehicle" v JOIN "User" u ON u.id=v."userId" WHERE u.email=$1',[email])).rows[0].id;
  expect((await api.post(`${lan}/api/modules/fuel`,{headers:origin,data:{vehicleId,date:'2026-09-11',estimatedRangeKm:720,actualDistanceKm:null,liters:42,pricePerLiter:7.75}})).ok()).toBe(true);
  expect((await api.post(`${lan}/api/modules/policies`,{headers:origin,data:{vehicleId,type:'Mandatory',provider:'Test',annualCost:2400,startDate:'2026-01-01',endDate:'2026-12-31'}})).ok()).toBe(true);
  expect((await api.post(`${lan}/api/modules/reminders`,{headers:origin,data:{vehicleId,type:'Test',title:'Annual test',dueDate:'2026-09-20',cost:120,notes:''}})).ok()).toBe(true);
  expect((await api.post(`${lan}/api/tasks`,{headers:origin,data:{title:'Daily stretch',description:'',status:'TODO',priority:'MEDIUM',dueDate:'2026-09-12',recurrence:'DAILY',recurrenceUntil:'2026-09-14'}})).ok()).toBe(true);
  expect(Number((await client.query('SELECT count(*) FROM "Task" t JOIN "User" u ON u.id=t."userId" WHERE u.email=$1 AND t.title=$2',[email,'Daily stretch'])).rows[0].count)).toBe(3);await client.end();
  await appPage.goto(`${lan}/`); await expect(appPage.getByRole('link',{name:/מים.*500.*מ״ל היום/})).toBeVisible(); await appPage.screenshot({path:'test-results/dark-dashboard.png',fullPage:true});
  await appPage.goto(`${lan}/car`); await expect(appPage.getByRole('heading',{name:'My car',exact:true})).toBeVisible(); await expect(appPage.getByText(/200.*לחודש/)).toBeVisible(); await expect(appPage.getByText('Annual test',{exact:false}).first()).toBeVisible();
  await appPage.goto(`${lan}/tasks`); await expect(appPage.getByRole('heading',{name:'לוח שנה חודשי'})).toBeVisible(); await expect(appPage.getByText('Workout',{exact:true}).first()).toBeVisible();
  await app.close();
});
