import { test,expect } from '@playwright/test';
import { Client } from 'pg';
import { createHash } from 'node:crypto';

test.use({channel:'msedge'});
test('fluid shell, water history, vehicle logo and food bank',async({page})=>{
  test.setTimeout(240000);
  const email=`general-layout-${Date.now()}@example.test`,db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  try{
    await page.goto('/login?mode=register');await page.getByLabel('שם',{exact:true}).fill('General layout');await page.getByLabel('כתובת אימייל').fill(email);await page.getByLabel('סיסמה').fill('Eight8!x');await page.getByRole('button',{name:'יצירת חשבון'}).click();await expect(page).toHaveURL('http://localhost:3000/');
    const headers={Origin:'http://localhost:3000'};
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());
    const weekday=['א','ב','ג','ד','ה','ו','ש'][new Date(today+'T00:00:00Z').getUTCDay()];
    expect((await page.request.post('/api/modules/goals',{headers,data:{waterGoalMl:2500,age:30,sex:'male',heightCm:180,weightKg:80,activityLevel:'moderate',weightGoal:'maintain',calorieGoal:2600,proteinGoalG:128}})).ok()).toBeTruthy();
    expect((await page.request.post('/api/modules/water',{headers,data:{amountMl:325,date:today}})).ok()).toBeTruthy();
    expect((await page.request.post('/api/modules/vehicles',{headers,data:{name:'Mazda 3',year:2022,roadMonth:5,licensePlate:'123-45-678',odometerKm:100,fuelTankLiters:50}})).ok()).toBeTruthy();
    for(const width of [320,430,507,600,834,1024,1440,1920]){
      const height=width===430?932:width===834?1194:width===1440?1000:width===1920?1080:800;await page.setViewportSize({width,height});
      for(const route of ['/','/tasks','/water','/car','/nutrition']){await page.goto(route);const ready=route==='/'?'.dashboard-home':route==='/tasks'?'.tasks-workspace':'.module-workspace';await page.locator(ready).waitFor();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();if([430,507,834,1440].includes(width)){const name=route==='/'?'home':route.slice(1);await page.screenshot({path:`test-results/general-${name}-${width}.png`,fullPage:true});}}
      await page.goto('/');await page.screenshot({path:`test-results/general-home-${width}.png`,fullPage:true});
      if(width<=1194){await page.locator("main").evaluate(el=>el.scrollTo(0,el.scrollHeight));const nav=await page.locator('.bottom-nav').boundingBox();expect(nav).not.toBeNull();expect(Math.abs(nav!.y+nav!.height-height)).toBeLessThan(2);}
    }
    await page.setViewportSize({width:1440,height:1000});await page.goto('/');
    const cardHeights=await page.locator('.module-grid>.module-card').evaluateAll(cards=>cards.map(card=>Math.round(card.getBoundingClientRect().height)));
    expect(Math.max(...cardHeights)-Math.min(...cardHeights)).toBeLessThanOrEqual(1);
    await page.goto('/tasks');
    const taskActionHeights=await page.locator('.time-primary-actions>*').evaluateAll(items=>items.map(item=>Math.round(item.getBoundingClientRect().height)));
    expect(Math.max(...taskActionHeights)-Math.min(...taskActionHeights)).toBeLessThanOrEqual(1);
    await page.goto('/water');
    const quickButtons=await page.locator('.quick-water .water-quick-button').evaluateAll(items=>items.map(item=>({width:Math.round(item.getBoundingClientRect().width),height:Math.round(item.getBoundingClientRect().height)})));
    expect(new Set(quickButtons.map(item=>item.width)).size).toBe(1);expect(new Set(quickButtons.map(item=>item.height)).size).toBe(1);
    for(const route of ['/water','/car','/nutrition']){await page.goto(route);const statRows=await page.locator('.module-stats>*').evaluateAll(items=>items.map(item=>Math.round(item.getBoundingClientRect().height)));expect(Math.max(...statRows)-Math.min(...statRows),`${route}: ${statRows.join(',')}`).toBeLessThanOrEqual(1);}
    await page.goto('/');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','/apple-touch-icon.png');
    const manifest=await page.request.get('/manifest.webmanifest');expect(manifest.ok()).toBeTruthy();expect(await manifest.text()).toContain('/sbo-icon-512.png');
    await page.setViewportSize({width:430,height:932});await page.goto('/water');
    await expect(page.locator('.water-history-days button')).toHaveCount(7);await expect(page.locator('.water-history-days button[aria-pressed="true"]')).toHaveText(weekday);await expect(page.getByRole('heading',{name:'325 מ״ל'})).toBeVisible();
    await page.goto('/nutrition');await page.getByLabel('חיפוש במאגר המזון').fill('חזה עוף');await page.getByRole('button',{name:'חיפוש',exact:true}).click();await expect(page.getByText('חזה עוף מבושל',{exact:true})).toBeVisible();await page.locator('.food-results').getByRole('button',{name:/הוספה/}).click();const dialog=page.locator('dialog[open]');await expect(dialog).toBeVisible();await expect(dialog.getByLabel('כמות בגרם')).toHaveValue('100');await expect(dialog.getByLabel('יחידה')).toHaveCount(0);await page.mouse.click(2,2);await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.goto('/');await expect(page.locator('.overview-vehicle img[alt="סמל Mazda 3"]')).toHaveAttribute('src',/google\.com\/s2\/favicons/);
  }finally{await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.query('DELETE FROM "LoginAttempt" WHERE key=$1',[createHash('sha256').update(email).digest('hex')]);await db.end();}
});
