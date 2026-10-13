import {test,expect} from '@playwright/test';
import {Client} from 'pg';
const headers={Origin:'http://localhost:3000'};
test('explicit source rescheduling, revision conflicts, rest timer and failed-save recovery',async({page,context})=>{
 const email='recovery-v4-'+Date.now()+'@example.test',db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try{
  expect((await page.request.post('/api/auth/register',{headers,data:{name:'Recovery QA',email,password:'TestingRecovery123!'}})).ok()).toBeTruthy();
  const plan=await (await page.request.post('/api/workouts/plans',{headers,data:{name:'Recovery plan',active:true,draft:false,archived:false,content:{startDate:null,endDate:null,walking:false,days:[{id:'day',weekday:0,name:'Upper',exercises:[{id:'chest',exerciseId:'builtin:chest',name:'לחיצת חזה במכונה',targetSets:3,repTargets:['8','8','8'],plannedWeightKg:null,restSeconds:90,notes:''}]}]}}})).json();
  let session=await (await page.request.post('/api/workouts/start',{headers,data:{planId:plan.id,dayId:'day',localDate:'2026-10-18'}})).json();
  const source=await page.request.post('/api/tasks',{headers,data:{title:'אימון חד פעמי',status:'IN_PROGRESS',priority:'MEDIUM',startDate:'2026-10-18',endDate:'2026-10-18',showOnCalendar:true}});expect(source.ok()).toBeTruthy();
  const taskId=(await db.query('SELECT id FROM "Task" WHERE "userId"=(SELECT id FROM "User" WHERE email=$1) AND title=$2',[email,'אימון חד פעמי'])).rows[0].id;
  const linked=await page.request.post('/api/workouts/links',{headers,data:{sourceKind:'task',sourceId:taskId,localDate:'2026-10-18',sessionId:session.id,hidden:true,confirmed:true}});expect(linked.ok(),await linked.text()).toBeTruthy();
  let response=await page.request.patch('/api/workouts/sessions/'+session.id,{headers,data:{revision:session.revision,performed:session.performed,action:'reschedule',localDate:'2026-10-20'}});expect(response.ok(),await response.text()).toBeTruthy();session=await response.json();
  expect((await db.query('SELECT "startDate"::text AS date FROM "Task" WHERE id=$1',[taskId])).rows[0].date).toBe('2026-10-20');
  expect((await page.request.patch('/api/workouts/sessions/'+session.id,{headers,data:{revision:0,performed:session.performed,action:'save'}})).status()).toBe(409);
  await page.request.post('/api/workouts/start',{headers,data:{planId:plan.id,dayId:'day',localDate:'2026-10-20'}});
  await page.goto('/workouts');await page.getByRole('button',{name:'אימון פעיל',exact:true}).click();
  await page.getByRole('spinbutton',{name:'לחיצת חזה במכונה סט 1 חזרות',exact:true}).fill('8');await page.getByRole('button',{name:'לחיצת חזה במכונה סט 1 בוצע',exact:true}).click();
  await expect(page.locator('.workout-rest strong')).not.toHaveText('00:00');await page.getByRole('button',{name:'השהיית מנוחה',exact:true}).click();const paused=await page.locator('.workout-rest strong').textContent();await page.waitForTimeout(1100);expect(await page.locator('.workout-rest strong').textContent()).toBe(paused);await page.getByRole('button',{name:'דלג על מנוחה',exact:true}).click();await expect(page.locator('.workout-rest strong')).toHaveText('00:00');
  await expect.poll(async()=>{const d=await (await page.request.get('/api/workouts/data')).json();return d.sessions[0].performed[0].sets[0].completed;}).toBe(true);
  await context.setOffline(true);const weight=page.getByRole('spinbutton',{name:'לחיצת חזה במכונה סט 1 משקל',exact:true});await weight.fill('27.5');await weight.blur();await expect(page.getByText(/הטיוטה נשמרה במכשיר/)).toBeVisible();
  await context.setOffline(false);await page.reload();await page.getByRole('button',{name:'אימון פעיל',exact:true}).click();await expect(weight).toHaveValue('27.5');await page.getByRole('button',{name:'שמירת התקדמות',exact:true}).click();await expect.poll(async()=>{const d=await (await page.request.get('/api/workouts/data')).json();return d.sessions[0].performed[0].sets[0].weightKg;}).toBe(27.5);
  session=(await (await page.request.get('/api/workouts/data')).json()).sessions[0];expect((await page.request.patch('/api/workouts/sessions/'+session.id,{headers,data:{revision:session.revision,performed:session.performed,action:'reschedule',localDate:'2026-10-21'}})).status()).toBe(400);
 }finally{await context.setOffline(false);await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}
});
