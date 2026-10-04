import {test,expect,type Locator} from '@playwright/test';
import {Client} from 'pg';
import {mergeFoodResults,searchSwissFoods} from '../../src/lib/food-search';

async function verifyDialog(dialog:Locator){
  const geometry=await dialog.evaluate(el=>{
    const box=el.getBoundingClientRect(),title=el.querySelector('.modal-heading h2')!.getBoundingClientRect(),close=el.querySelector('.modal-heading>.icon-button')!.getBoundingClientRect();
    const buttons=[...el.querySelectorAll('.modal-actions .button')].map(item=>item.getBoundingClientRect());
    return {width:box.width,height:box.height,viewport:innerHeight,overflow:el.scrollWidth>el.clientWidth,titleCenter:(title.left+title.right)/2,center:(box.left+box.right)/2,closeLeft:close.left,boxLeft:box.left,buttons:buttons.map(b=>({width:b.width,height:b.height}))};
  });
  expect(geometry.overflow).toBeFalsy();expect(geometry.height).toBeLessThan(geometry.viewport);
  expect(Math.abs(geometry.titleCenter-geometry.center)).toBeLessThan(2);
  expect(geometry.closeLeft-geometry.boxLeft).toBeLessThan(25);
  if(geometry.buttons.length===2){expect(Math.abs(geometry.buttons[0].width-geometry.buttons[1].width)).toBeLessThan(1);expect(geometry.buttons[0].height).toBe(geometry.buttons[1].height);}
}

test('free catalog merges preserve Hebrew priority and barcode deduplication',()=>{
  const base={calories:100,proteinG:2,carbsG:20,fatG:1};
  const foods=mergeFoodResults([{...base,id:'usda:1',name:'Apple',source:'USDA',barcode:'12345678'}, {...base,id:'off:1',name:'תפוח',source:'Open Food Facts',barcode:'12345678'}, {...base,id:'moh:1',name:'תפוח טרי',source:'משרד הבריאות'}]);
  expect(foods.map(food=>food.id)).toEqual(['moh:1','off:1']);
  expect(searchSwissFoods('banana').length).toBeGreaterThan(0);
});

test('four cards fit the viewport and compact dialogs keep paired controls aligned',async({page})=>{
  test.setTimeout(120000);
  const email=`compact-${Date.now()}@example.test`,db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  try{
    await page.setViewportSize({width:390,height:844});await page.goto('/login?mode=register');
    await page.getByLabel('שם',{exact:true}).fill('בדיקת סימטריה');await page.getByLabel('כתובת אימייל').fill(email);await page.getByLabel('סיסמה').fill('Eight8!x');await page.getByRole('button',{name:'יצירת חשבון'}).click();await expect(page).toHaveURL('http://localhost:3000/');
    const headers={Origin:'http://localhost:3000'};
    expect((await page.request.post('/api/modules/vehicles',{headers,data:{name:'MAZDA 3',year:2024,roadMonth:5,licensePlate:'123-45-678',odometerKm:100000,fuelTankLiters:60}})).ok()).toBeTruthy();
    for(const size of [{width:320,height:568},{width:390,height:844},{width:507,height:800},{width:834,height:1112},{width:1440,height:900}]){
      await page.setViewportSize(size);await page.goto('/');await expect(page.locator('.overview-card')).toHaveCount(4);
      await page.screenshot({path:`test-results/compact-dashboard-${size.width}.png`});
      const layout=await page.locator('.workspace').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth}));
      expect(layout.scroll,JSON.stringify(size)).toBeLessThanOrEqual(layout.height+1);expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
      for(const card of await page.locator('.overview-card').all()){
        const metrics=await card.evaluate(el=>{const media=el.querySelector('.dashboard-art,.dashboard-car-photo')!,content=el.querySelector('.overview-content')!;return{height:content.clientHeight,scroll:content.scrollHeight,mediaRight:media.getBoundingClientRect().right,contentLeft:content.getBoundingClientRect().left,mask:getComputedStyle(media).maskImage};});
        expect(metrics.scroll,`card content at ${size.width}`).toBeLessThanOrEqual(metrics.height+1);expect(metrics.mediaRight).toBeLessThanOrEqual(metrics.contentLeft+1);expect(metrics.mask).toContain('linear-gradient');
      }
      await page.screenshot({path:`test-results/compact-dashboard-${size.width}.png`});
    }
    await page.setViewportSize({width:390,height:844});await page.goto('/car');await page.getByRole('button',{name:/הוספת תדלוק/}).click();const fuel=page.locator('.fuel-entry-modal[open]');await verifyDialog(fuel);
    await expect(fuel.getByRole('radio',{name:'כן',exact:true})).toHaveAttribute('aria-checked','true');
    const fields=await fuel.locator('.record-form-grid>label').evaluateAll(labels=>labels.map(el=>{const control=el.querySelector('input,select,.boolean-control,.israeli-date-picker')!,box=control.getBoundingClientRect();return {width:box.width,top:box.top,height:box.height};}));
    for(const [a,b] of [[1,2],[3,4],[5,6]]){expect(Math.abs(fields[a].top-fields[b].top)).toBeLessThan(1);expect(Math.abs(fields[a].width-fields[b].width)).toBeLessThan(1);expect(fields[a].height).toBe(fields[b].height);}
    expect(fields[7].width).toBeGreaterThan(fields[1].width*1.9);
    await fuel.getByRole('radio',{name:'לא',exact:true}).click();await expect(fuel.getByRole('radio',{name:'לא',exact:true})).toHaveAttribute('aria-checked','true');await page.screenshot({path:'test-results/compact-fuel-modal.png'});await page.mouse.click(4,4);await expect(fuel).toHaveCount(0);
    await page.goto('/tasks');await page.getByRole('button',{name:/יצירת משימה/}).click();await verifyDialog(page.locator('.task-editor-modal[open]'));await page.screenshot({path:'test-results/compact-task-modal.png'});await page.keyboard.press('Escape');
    await page.getByRole('button',{name:/יצירת אירוע/}).click();await verifyDialog(page.locator('.event-editor-modal[open]'));await page.keyboard.press('Escape');
    await page.goto('/nutrition');
    const searchResponse=await page.request.get('/api/nutrition/search?q=banana');expect(searchResponse.ok()).toBeTruthy();
    const aggregated=await searchResponse.json();expect(aggregated.foods.some((item:{source:string})=>item.source.startsWith('Swiss'))).toBeTruthy();
    console.log('Food providers:',[...new Set(aggregated.foods.map((item:{source:string})=>item.source))],'Unavailable:',aggregated.unavailableSources);
    await page.getByRole('button',{name:/הוספת מזון/}).click();const food=page.locator('.nutrition-add-modal[open]');await verifyDialog(food);
    const initial=(await food.boundingBox())!.height;expect(initial).toBeLessThan(260);await expect(food.getByRole('checkbox')).toHaveCount(0);
    await page.route('**/api/nutrition/search?*',route=>route.fulfill({json:{foods:Array.from({length:5},(_,i)=>({id:`moh:${i}`,name:`מזון בדיקה ${i}`,source:'משרד הבריאות',calories:100,proteinG:20,carbsG:5,fatG:2})),unavailableSources:[]}}));
    await food.getByRole('textbox',{name:'חיפוש מזון'}).fill('מזון');await expect(food.locator('.nutrition-results article')).toHaveCount(5);expect((await food.boundingBox())!.height).toBeGreaterThan(initial);await page.screenshot({path:'test-results/compact-food-search.png'});await page.keyboard.press('Escape');
  }finally{await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}
});
