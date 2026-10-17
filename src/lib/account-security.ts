import {createHash, randomBytes} from 'node:crypto';
import {db} from './db';
import {currentSession} from './auth';
import {HttpError} from './http';
import {verifyPassword} from './password';
import {cookies} from 'next/headers';

export const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const secretToken=()=>randomBytes(32).toString('base64url');
export async function accountSession(){const session=await currentSession();if(!session)throw new HttpError(401,'יש להתחבר מחדש.');return session;}
export async function adminSession(){const session=await accountSession();if(session.user.role!=='admin')throw new HttpError(403,'אין הרשאה לניהול המערכת.');return session;}
export async function accountLimit(key:string,limit=10){
 const hash=tokenHash(key),now=new Date();
 await db.loginAttempt.deleteMany({where:{key:hash,windowStart:{lt:new Date(now.valueOf()-15*60000)}}});
 const attempt=await db.loginAttempt.upsert({where:{key:hash},create:{key:hash},update:{count:{increment:1}}});
 if(attempt.count>limit)throw new HttpError(429,'יותר מדי ניסיונות. אפשר לנסות שוב בעוד 15 דקות.');
}
export async function reauthenticate(user:{id:string;passwordHash:string},password:string){
 await accountLimit(`reauth:${user.id}`);
 const proof=(await cookies()).get('sbo_stepup')?.value;
 if(proof){const session=await currentSession();if(session&&session.userId===user.id&&await db.accountToken.findFirst({where:{tokenHash:tokenHash(proof),userId:user.id,purpose:'reauth',invitationId:session.id,expiresAt:{gt:new Date()}}}))return;}
 if(!password||!await verifyPassword(password,user.passwordHash))throw new HttpError(401,'יש לאמת את הסיסמה הנוכחית.');
}
export function appOrigin(){
 const origin=process.env.SBO_APP_URL??'https://sbo-pi.vercel.app';
 const url=new URL(origin);
 if(url.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('Invalid canonical app origin');
 return url.origin;
}
export async function revokeAccountSessions(userId:string,exceptId?:string){
 await db.$transaction([
  db.pushSubscription.updateMany({where:{userId,...(exceptId?{OR:[{sessionId:{not:exceptId}},{sessionId:null}]}:{})},data:{enabled:false}}),
  db.session.deleteMany({where:{userId,...(exceptId?{id:{not:exceptId}}:{})}})
 ]);
}
