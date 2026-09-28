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
    expect((await page.request.post('/api/modules/vehicles',{headers,data:{name:'Tesla Model 3',year:2024,roadMonth:5,licensePlate:'123-45-678',odometerKm:12000,fuelTankLiters:60}})).ok()).toBeTruthy();
    await page.goto('/car');await expect(page.locator('.vehicle-visual.electric')).toBeVisible();
    await page.getByRole('button',{name:/הוספת תדלוק/}).click();
    const fuelDialog=page.locator('.fuel-entry-modal:visible');
    await expect(fuelDialog.getByLabel(/קילומטראז׳ נוכחי/)).not.toHaveAttribute('required','');
    await expect(fuelDialog.getByLabel(/הערות/)).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await fuelDialog.getByRole('button',{name:'סגירת הטופס'}).click();await expect(page.locator('.record-modal[open]')).toHaveCount(0);
    const manifest=await page.request.get('/manifest.webmanifest');expect(await manifest.text()).toContain('#121417');
    const offline=await page.request.get('/offline');expect(offline.ok()).toBeTruthy();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }finally{await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}
});
