import 'dotenv/config';
import assert from 'node:assert/strict';
const expect=(actual:unknown)=>({toBe:(expected:unknown)=>assert.equal(actual,expected),toContain:(expected:string)=>assert.ok(String(actual).includes(expected))});
import {db} from '../../src/lib/db';
import {purgeExpiredAccounts} from '../../src/lib/account-maintenance';
import {pushAllowed} from '../../src/lib/push-access';

async function verify(){
 if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))throw new Error('Local database only');
 const stamp=Date.now(),now=new Date(),ids:string[]=[];
 try{
  const old=await db.user.create({data:{email:`purge-old-${stamp}@example.test`,name:'Private name',passwordHash:'test',status:'pending_deletion',deletionRequestedAt:new Date(stamp-31*86400000)}});ids.push(old.id);
  const fresh=await db.user.create({data:{email:`purge-fresh-${stamp}@example.test`,name:'Recent',passwordHash:'test',status:'pending_deletion',deletionRequestedAt:new Date(stamp-29*86400000)}});ids.push(fresh.id);
  await db.userSettings.create({data:{userId:old.id}});
  await db.task.create({data:{userId:old.id,title:'Private task'}});
  const employment=await db.employment.create({data:{userId:old.id,name:'Private employer'}});
  await db.workContractVersion.create({data:{userId:old.id,employmentId:employment.id,effectiveFrom:new Date('2026-01-01'),contract:{baseSalary:12345}}});
  await purgeExpiredAccounts(now);
  const erased=await db.user.findUniqueOrThrow({where:{id:old.id}});
  expect(erased.status).toBe('deleted');expect(erased.passwordHash).toBe('');expect(erased.email).toContain('@invalid.local');
  expect(await db.task.count({where:{userId:old.id}})).toBe(0);expect(await db.employment.count({where:{userId:old.id}})).toBe(0);
  expect((await db.user.findUniqueOrThrow({where:{id:fresh.id}})).status).toBe('pending_deletion');
  await db.user.update({where:{id:fresh.id},data:{status:'active',deletionRequestedAt:null}});
  await db.userSettings.create({data:{userId:fresh.id,notificationsEnabled:true,notificationsResumedAt:now}});
  const session=await db.session.create({data:{userId:fresh.id,tokenHash:`qa-${stamp}`,expiresAt:new Date(stamp+60000)}});
  const sub=await db.pushSubscription.create({data:{userId:fresh.id,sessionId:session.id,endpoint:`https://example.invalid/${stamp}`,p256dh:'test',auth:'test',connectedAt:now}});
  expect(await pushAllowed(sub.id,false,new Date(stamp-60000))).toBe(false);
  expect(await pushAllowed(sub.id,false,new Date(stamp+60000))).toBe(true);
  await db.userSettings.update({where:{userId:fresh.id},data:{notificationsEnabled:false}});
  expect(await pushAllowed(sub.id)).toBe(false);expect(await pushAllowed(sub.id,true)).toBe(true);
  await db.session.delete({where:{id:session.id}});expect(await pushAllowed(sub.id,true)).toBe(false);
 }finally{await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();}
}
verify().then(()=>console.log("V6 maintenance and push isolation passed"));
