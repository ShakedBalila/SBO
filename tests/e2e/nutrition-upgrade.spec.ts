import { test, expect } from '@playwright/test';
import { Client } from 'pg';

test('nutrition diary searches the Ministry catalog and calculates from 100 grams on phones',async({page})=>{
  const email=`nutrition-${Date.now()}@example.test`,database=new Client({connectionString:process.env.DATABASE_URL});await database.connect();
  try{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/login?mode=register');
    await page.getByLabel('שם',{exact:true}).fill('בדיקת תזונה');
    await page.getByLabel('כתובת אימייל').fill(email);
    await page.getByLabel('סיסמה').fill('Eight8!x');
    await page.getByRole('button',{name:'יצירת חשבון'}).click();
    await page.goto('/nutrition');
    await expect(page.getByRole('heading',{name:'יומן האכילה שלי'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.getByRole('button',{name:/הוספת מזון/}).click();
    const dialog=page.locator('.nutrition-add-modal[open]');
    await dialog.getByPlaceholder('חיפוש מזון בעברית…').fill('בננה');
    const result=dialog.locator('.nutrition-results article').filter({hasText:'משרד הבריאות'}).first();
    await expect(result).toBeVisible();
    await result.locator('.food-result-main').click();
    await dialog.getByLabel('כמות שאכלת (גרם)').fill('150');
    await dialog.getByRole('button',{name:'הוספה ליומן'}).click();
    await expect(page.locator('.nutrition-entry-list')).toContainText('בננה');
    await expect(page.locator('.nutrition-summary')).not.toContainText('0\nקלוריות');
    for(const width of [320,390,507,834,1440]){await page.setViewportSize({width,height:width===834?1112:844});await page.goto('/nutrition');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}px`).toBeTruthy();}
    await page.setViewportSize({width:390,height:844});await page.goto('/nutrition');await page.screenshot({path:'test-results/nutrition-mobile.png',fullPage:true});
  }finally{await database.query('DELETE FROM "User" WHERE email=$1',[email]);await database.end();}
});
