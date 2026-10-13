import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {Client} from 'pg';
const headers={Origin:'http://localhost:3000'};
test('exercise media is private, validated, and failed import writes nothing',async({page,browser})=>{
 const email='media-v4-'+Date.now()+'@example.test',db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try{await page.request.post('/api/auth/register',{headers,data:{name:'Media test',email,password:'TestingMedia123!'}});
 const r=await page.request.post('/api/workouts/exercises',{headers,data:{name:'התרגיל האישי',details:{equipment:'המכונה שלי',videoUrl:''}}});expect(r.ok()).toBeTruthy();const id=(await r.json()).id;
 let response=await page.request.post('/api/workouts/image/'+id,{headers,multipart:{file:{name:'image.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg onload="alert(1)"></svg>')}}});expect(response.status()).toBe(400);
 response=await page.request.post('/api/workouts/image/'+id,{headers,multipart:{file:{name:'equipment.png',mimeType:'image/png',buffer:readFileSync('public/sbo-icon-32.png')}}});expect(response.ok(),await response.text()).toBeTruthy();
 response=await page.request.get('/api/workouts/image/'+id);expect(response.ok()).toBeTruthy();expect(response.headers()['content-type']).toBe('image/png');expect(response.headers()['cache-control']).toContain('no-store');
 const before=(await (await page.request.get('/api/workouts/data')).json()).plans.length;
 response=await page.request.post('/api/workouts/preview',{headers,multipart:{file:{name:'empty.csv',mimeType:'text/csv',buffer:Buffer.from('Unstructured plan with no sets')}}});expect(response.status()).toBe(400);expect((await (await page.request.get('/api/workouts/data')).json()).plans).toHaveLength(before);
 const other=await browser.newContext(),otherPage=await other.newPage();await otherPage.request.post('/api/auth/register',{headers,data:{name:'Other',email:'other-'+email,password:'TestingMedia123!'}});expect((await otherPage.request.get('/api/workouts/image/'+id)).status()).toBe(404);await other.close();
 await page.goto('/workouts');await page.getByRole('button',{name:'ספריית תרגילים',exact:true}).click();const card=page.locator('.workout-exercise').filter({hasText:'התרגיל האישי'});await expect(card.locator('img')).toBeVisible();await expect(card).toContainText('טרם צורף סרטון');
 const exported=await (await page.request.get('/api/workouts/export')).json();expect(exported.exercises[0]).not.toHaveProperty('image');
 }finally{await db.query('DELETE FROM "User" WHERE email=ANY($1::text[])',[[email,'other-'+email]]);await db.end();}
});
