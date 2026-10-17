import {Client} from 'pg';
import {randomBytes,createHash} from 'node:crypto';
import type {APIRequestContext} from '@playwright/test';
// Simulates the trusted email-verification provider in a LOCAL database only.
// Production routes never accept a test bypass or a shared invite as email proof.
export async function verifiedInvitation(email:string){
 const url=new URL(process.env.DATABASE_URL!);if(!['localhost','127.0.0.1','::1'].includes(url.hostname))throw new Error('Invitation fixtures require a local DB');
 const db=new Client({connectionString:url.toString()});await db.connect();
 try{
  await db.query(`INSERT INTO "User" (id,email,name,"passwordHash","updatedAt") VALUES ('qa-invite-issuer','qa-invite-issuer@example.test','QA issuer','',now()) ON CONFLICT DO NOTHING`);
  const id=randomBytes(16).toString('hex'),raw=randomBytes(32).toString('hex'),hash=createHash('sha256').update(raw).digest('hex');
  await db.query(`INSERT INTO "Invitation" (id,email,"tokenHash","issuerId","expiresAt") VALUES ($1,$2,$3,'qa-invite-issuer',now()+interval '72 hours')`,[id,email.toLowerCase(),createHash('sha256').update(randomBytes(32)).digest('hex')]);
  await db.query(`INSERT INTO "AccountToken" (id,email,purpose,"invitationId","tokenHash","expiresAt") VALUES ($1,$2,'registration',$3,$4,now()+interval '30 minutes')`,['proof-'+id,email.toLowerCase(),id,hash]);
  return {token:raw,invitationId:id};
 }finally{await db.end();}
}
export async function registerInvited(request:APIRequestContext,options:{headers?:Record<string,string>;data:Record<string,unknown>}){
 const proof=await verifiedInvitation(String(options.data.email));
 const response=await request.post('/api/auth/register',{...options,data:{...options.data,verificationToken:proof.token}});
 if(response.ok())await request.post('/api/module-preferences',{headers:{Origin:'http://localhost:3000'},data:{action:'onboarding',modules:['tasks','work','water','nutrition','car','workouts']}});
 return response;
}
