import {registerInvited} from './invitation-fixture';
import {test,expect} from '@playwright/test';
import {Client} from 'pg';

test('strong passwords, owned device sessions, revocation and CSRF protection',async({browser})=>{
 const email=`security-${Date.now()}@example.test`,password='Long passphrase 2026!',nextPassword='Changed passphrase 2026!',origin={Origin:'http://localhost:3000'},db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
 const first=await browser.newContext(),page=await first.newPage();
 try{
  expect((await registerInvited(page.request,{headers:origin,data:{name:'Security QA',email,password:'short-pass'}})).status()).toBe(400);
  expect((await registerInvited(page.request,{headers:origin,data:{name:'Security QA',email,password}})).ok()).toBeTruthy();
  let body=await (await page.request.get('/api/security/sessions')).json();expect(body.sessions).toHaveLength(1);expect(body.sessions[0].current).toBe(true);expect(body.sessions[0]).not.toHaveProperty('tokenHash');
  const second=await browser.newContext(),secondPage=await second.newPage();expect((await secondPage.request.post('/api/auth/login',{headers:origin,data:{email,password}})).ok()).toBeTruthy();
  body=await (await page.request.get('/api/security/sessions')).json();expect(body.sessions).toHaveLength(2);expect((await page.request.post('/api/security/revoke-others',{headers:origin,data:{}})).ok()).toBeTruthy();expect((await secondPage.request.get('/api/work/data')).status()).toBe(401);await second.close();
  expect((await page.request.post('/api/settings',{headers:{Origin:'https://attacker.example'},data:{name:'Nope',timezone:'Asia/Jerusalem',currency:'ILS'}})).status()).toBe(403);
  expect((await page.request.post('/api/security/password',{headers:origin,data:{currentPassword:password,newPassword:nextPassword}})).ok()).toBeTruthy();
  await page.request.post('/api/auth/logout',{headers:origin,data:{}});expect((await page.request.post('/api/auth/login',{headers:origin,data:{email,password}})).status()).toBe(401);expect((await page.request.post('/api/auth/login',{headers:origin,data:{email,password:nextPassword}})).ok()).toBeTruthy();
  expect(Number((await db.query('SELECT count(*)::int AS count FROM "AuditEvent" WHERE "userId"=(SELECT id FROM "User" WHERE email=$1)',[email])).rows[0].count)).toBeGreaterThanOrEqual(3);
 }finally{await first.close();await db.query('DELETE FROM "User" WHERE email=$1',[email]);await db.end();}
});
