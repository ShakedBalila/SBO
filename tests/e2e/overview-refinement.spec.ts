import {test,expect} from '@playwright/test';
import {Client} from 'pg';
import {workDefaults} from '../../src/lib/work-calculations';
test('cohesive five-image bento fits empty and populated accounts on phone, split screen and desktop',async({page})=>{
 test.setTimeout(120000);const email=`overview-${Date.now()}@example.test`,db=new Client({connectionString:process.env.DATABASE_URL}),headers={Origin:'http://localhost:3000'},errors:string[]=[];await db.connect();page.on('pageerror',e=>errors.push(e.message));
 try{
  expect((await page.request.post('/api/auth/register',{headers,data:{name:'בדיקת סקירה',email,password:'OnlyTesting123!'}})).ok()).toBeTruthy();
  const today=(await (await page.request.get('/api/work/data')).json()).today;
  for(const state of ['empty','populated']){
   if(state==='populated'){
    const actions=[['modules/goals',{waterGoalMl:2500,nutritionGoalMode:'manual',calorieGoal:2759,proteinGoalG:140}],['modules/water',{date:today,amountMl:1750}],['modules/nutrition',{date:today,name:'ארוחה לבדיקה',calories:2375,proteinG:128.5}],['modules/vehicles',{name:'MAZDA 3',year:2024,roadMonth:5,licensePlate:'123-45-678',odometerKm:100000,fuelTankLiters:70}],['work/settings',{...workDefaults,employmentStartDate:'2026-10-01',baseSalary:16000,standardMinutes:504,vacationDays:15}],['work/entries',{date:today,type:'WORK',startTime:'08:00',endTime:'17:00',breakMinutes:30,overtimeApproved:true}]] as const;
    for(const [path,data] of actions)expect((await page.request.post(`/api/${path}`,{headers,data})).ok()).toBeTruthy();
    for(let n=0;n<3;n++)expect((await page.request.post('/api/tasks',{headers,data:{title:`משימה ${n}`,priority:'HIGH',startDate:today,endDate:today}})).ok()).toBeTruthy();
    const vehicleId=(await db.query('SELECT id FROM "Vehicle" WHERE "userId"=(SELECT id FROM "User" WHERE email=$1)',[email])).rows[0].id;
    for(const type of ['Mandatory','Comprehensive'])expect((await page.request.post('/api/modules/policies',{headers,data:{vehicleId,type,annualCost:1200,startDate:'2026-01-01',endDate:'2027-06-30'}})).ok()).toBeTruthy();
    expect((await page.request.post('/api/modules/reminders',{headers,data:{vehicleId,type:'Test',title:'טסט',dueDate:today,expiryDate:'2027-10-12',licenseFee:100,testFee:100}})).ok()).toBeTruthy();
   }
   for(const size of [{width:320,height:568},{width:375,height:812},{width:390,height:844},{width:430,height:932},{width:507,height:800},{width:834,height:1112},{width:1440,height:900}]){
    await page.setViewportSize(size);await page.goto('/');await expect(page.locator('.overview-card:visible')).toHaveCount(6);await expect.poll(()=>page.locator('.card-image-layer img:visible').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBeTruthy();
    const workspace=await page.locator('.workspace').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth}));expect(workspace.scroll,`${state} ${size.width}`).toBeLessThanOrEqual(workspace.height+1);expect(workspace.scrollWidth).toBeLessThanOrEqual(workspace.width+1);
    for(const card of await page.locator('.overview-card:visible').all()){
     const bounds=await card.evaluate(el=>{const content=el.querySelector('.overview-content')!,media=el.querySelector('.card-image-layer')!,card=el.getBoundingClientRect(),image=media.querySelector('img') as HTMLImageElement;return {height:content.clientHeight,scroll:content.scrollHeight,mediaHeight:media.getBoundingClientRect().height,cardHeight:card.height,fraction:media.getBoundingClientRect().width/card.width,naturalWidth:image.naturalWidth};});
     expect(bounds.scroll,`${state} ${size.width} ${await card.getAttribute('class')}`).toBeLessThanOrEqual(bounds.height+1);expect(Math.abs(bounds.mediaHeight-bounds.cardHeight)).toBeLessThanOrEqual(2);expect(bounds.fraction).toBeGreaterThanOrEqual(.35);expect(bounds.fraction).toBeLessThanOrEqual(.55);expect(bounds.naturalWidth).toBeGreaterThanOrEqual(900);
    }
    const tasks=(await page.locator('.overview-tasks:visible').boundingBox())!,work=(await page.locator('.overview-work:visible').boundingBox())!;expect(Math.abs(tasks.y-work.y)).toBeLessThan(2);expect(Math.abs(tasks.height-work.height)).toBeLessThan(2);await page.screenshot({path:`test-results/overview-${state}-${size.width}.png`});
   }
  }
  expect(errors).toEqual([]);
 }finally{await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}
});
