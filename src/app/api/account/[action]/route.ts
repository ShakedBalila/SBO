import {NextResponse} from 'next/server';
import {z} from 'zod';
import sharp from 'sharp';
import {db} from '@/lib/db';
import {apiError,checkOrigin,HttpError,jsonBody} from '@/lib/http';
import {accountSession,reauthenticate,secretToken,tokenHash,accountLimit,revokeAccountSessions} from '@/lib/account-security';
import {mailConfigured,sendAccountMail} from '@/lib/account-mail';
import {audit} from '@/lib/audit';
import {createSession,deleteSession} from '@/lib/auth';
import {hashPassword,verifyPassword} from '@/lib/password';
type Context={params:Promise<{action:string}>};
const email=z.email().max(254).transform(v=>v.trim().toLowerCase());
const token=z.string().min(32).max(128);
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
export async function GET(request:Request,context:Context){try{
 const {action}=await context.params,session=await accountSession();
 if(action==='avatar'){const row=await db.user.findUnique({where:{id:session.userId},select:{avatar:true}});if(!row?.avatar)throw new HttpError(404,'אין תמונת פרופיל.');return new Response(new Uint8Array(row.avatar),{headers:{...headers,'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff'}});}
 if(action==='profile')return NextResponse.json({name:session.user.name,firstName:session.user.firstName,lastName:session.user.lastName,phone:session.user.phone,email:session.user.email,verified:Boolean(session.user.emailVerifiedAt),avatar:Boolean(session.user.avatar),role:session.user.role,google:Boolean(await db.accountIdentity.findUnique({where:{userId_provider:{userId:session.userId,provider:'google'}}})),mailConfigured:mailConfigured(),googleConfigured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)}, {headers});
 throw new HttpError(404,'לא נמצא.');
}catch(error){return apiError(error);}}
export async function POST(request:Request,context:Context){try{
 checkOrigin(request);const {action}=await context.params;
 if(action==='recover'){
  const value=z.object({email,password:z.string().min(1).max(128),confirm:z.literal(true)}).strict().parse(await jsonBody(request));
  await accountLimit(`recover:${value.email}`);const user=await db.user.findUnique({where:{email:value.email}});
  if(!user||!await verifyPassword(value.password,user.passwordHash)||user.status!=='pending_deletion'||!user.deletionRequestedAt||Date.now()-user.deletionRequestedAt.valueOf()>=30*86400000)throw new HttpError(400,'לא ניתן לשחזר עם הפרטים האלה או שחלף מועד השחזור.');
  const result=await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;return tx.user.updateMany({where:{id:user.id,status:'pending_deletion',deletionRequestedAt:{gt:new Date(Date.now()-30*86400000)}},data:{status:'active',deletionRequestedAt:null}});});
  if(!result.count)throw new HttpError(409,'מצב החשבון השתנה.');await audit({userId:user.id,action:'DELETION_CANCELLED'});await createSession(user.id,request.headers.get('user-agent')??'');return NextResponse.json({ok:true});
 }
 if(action==='recover-google'){
  const value=z.object({token,confirm:z.literal(true)}).strict().parse(await jsonBody(request));
  const userId=await db.$transaction(async tx=>{const proof=await tx.accountToken.findUnique({where:{tokenHash:tokenHash(value.token)}});if(!proof?.userId||proof.purpose!=='recover'||proof.usedAt||proof.expiresAt<=new Date())throw new HttpError(400,'אימות השחזור פג. יש להתחבר שוב דרך Google.');await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${proof.userId}))`;const used=await tx.accountToken.updateMany({where:{id:proof.id,usedAt:null},data:{usedAt:new Date()}});if(!used.count)throw new HttpError(409,'האימות כבר נוצל.');const result=await tx.user.updateMany({where:{id:proof.userId,status:'pending_deletion',deletionRequestedAt:{gt:new Date(Date.now()-30*86400000)}},data:{status:'active',deletionRequestedAt:null}});if(!result.count)throw new HttpError(409,'חלף מועד השחזור או שמצב החשבון השתנה.');return proof.userId;});await audit({userId,action:'DELETION_CANCELLED'});await createSession(userId,request.headers.get('user-agent')??'');return NextResponse.json({ok:true});
 }
 if(action==='request-reset'){
  const value=z.object({email}).strict().parse(await jsonBody(request));await accountLimit(`reset:${value.email}`,4);
  if(!mailConfigured())throw new HttpError(503,'איפוס באמצעות מייל עדיין לא מחובר.');
  const user=await db.user.findUnique({where:{email:value.email}});
  if(user?.status==='active'){const raw=secretToken();await db.accountToken.create({data:{userId:user.id,email:user.email,purpose:'reset',tokenHash:tokenHash(raw),expiresAt:new Date(Date.now()+30*60000)}});await sendAccountMail(user.email,'איפוס סיסמה','קישור אישי לאיפוס הסיסמה, תקף ל־30 דקות.',`/account-action#reset=${raw}`);}
  return NextResponse.json({ok:true,message:'אם החשבון מתאים, בקשת האיפוס תישלח למייל.'});
 }
 if(action==='reset'||action==='verify-email'){
  const value=z.object({token,newPassword:z.string().min(12).max(128).optional()}).strict().parse(await jsonBody(request));
  const passwordHash=action==='reset'&&value.newPassword?await hashPassword(value.newPassword):null;
  if(action==='reset'&&!passwordHash)throw new HttpError(400,'יש להזין סיסמה חדשה.');
  const userId=await db.$transaction(async tx=>{
   const row=await tx.accountToken.findUnique({where:{tokenHash:tokenHash(value.token)}});
   if(!row||!row.userId||row.usedAt||row.expiresAt<=new Date()||row.purpose!==(action==='reset'?'reset':'email'))throw new HttpError(400,'הקישור אינו תקין או שפג תוקפו.');
   const user=await tx.user.findUnique({where:{id:row.userId}});if(user?.status!=='active')throw new HttpError(400,'לא ניתן לבצע את הפעולה.');
   const used=await tx.accountToken.updateMany({where:{id:row.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});if(!used.count)throw new HttpError(409,'הקישור כבר נוצל.');
   await tx.user.update({where:{id:row.userId},data:passwordHash?{passwordHash}:{email:row.email,emailVerifiedAt:new Date()}});
   await tx.accountToken.updateMany({where:{userId:row.userId,purpose:row.purpose,usedAt:null},data:{usedAt:new Date()}});
   await tx.pushSubscription.updateMany({where:{userId:row.userId},data:{enabled:false}});await tx.session.deleteMany({where:{userId:row.userId}});
   return row.userId;
  });await audit({userId,action:action==='reset'?'PASSWORD_RESET':'EMAIL_VERIFIED'});return NextResponse.json({ok:true});
 }
 const session=await accountSession();
 if(action==='avatar'){
  await accountLimit(`avatar:${session.userId}`,20);
  if(Number(request.headers.get('content-length')??0)>3_300_000)throw new HttpError(413,'תמונה עד 3 MB.');
  const data=await request.formData(),file=data.get('file');if(!(file instanceof File)||file.size>3_000_000||!file.size)throw new HttpError(400,'יש לבחור תמונה עד 3 MB.');
  const bytes=Buffer.from(await file.arrayBuffer()),metadata=await sharp(bytes,{limitInputPixels:20_000_000}).metadata();
  if(!metadata.format||!['jpeg','png','webp'].includes(metadata.format))throw new HttpError(400,'ניתן לבחור JPEG, PNG או WebP.');
  const avatar=await sharp(bytes,{limitInputPixels:20_000_000}).rotate().resize(384,384,{fit:'cover',position:'centre'}).jpeg({quality:85}).toBuffer();
  await db.user.update({where:{id:session.userId},data:{avatar}});return NextResponse.json({ok:true});
 }
 const body=await jsonBody(request);
 if(action==='profile'){
  const data=z.object({name:z.string().trim().min(1).max(100),firstName:z.string().trim().max(80),lastName:z.string().trim().max(80),phone:z.string().trim().max(30)}).strict().parse(body);
  await db.user.update({where:{id:session.userId},data});await audit({userId:session.userId,action:'PROFILE_UPDATED',changedFields:Object.keys(data)});return NextResponse.json({ok:true});
 }
 if(action==='remove-avatar'){await db.user.update({where:{id:session.userId},data:{avatar:null}});return NextResponse.json({ok:true});}
 if(action==='preferences'){
  const data=z.object({reducedMotion:z.boolean(),textScale:z.union([z.literal(100),z.literal(125),z.literal(150),z.literal(200)])}).strict().parse(body);
  await db.userSettings.upsert({where:{userId:session.userId},create:{userId:session.userId,...data},update:data});return NextResponse.json({ok:true});
 }
 if(action==='email'){
  const data=z.object({email,password:z.string().max(128)}).strict().parse(body);await reauthenticate(session.user,data.password);
  if(!mailConfigured())throw new HttpError(503,'שירות אימות המייל עדיין לא מחובר; כתובת החשבון לא שונתה.');
  if(await db.user.findFirst({where:{email:data.email,id:{not:session.userId}}}))throw new HttpError(400,'לא ניתן להשתמש בכתובת הזו.');
  const raw=secretToken();await db.accountToken.create({data:{userId:session.userId,email:data.email,purpose:'email',tokenHash:tokenHash(raw),expiresAt:new Date(Date.now()+30*60000)}});
  await sendAccountMail(data.email,'אימות כתובת מייל','אמת את כתובת המייל שלך. הקישור תקף ל־30 דקות.',`/account-action#email=${raw}`);return NextResponse.json({ok:true,message:'הבקשה התקבלה אצל ספק המייל. הכתובת תשתנה רק לאחר אימות.'});
 }
 if(action==='unlink-google'){
  const data=z.object({password:z.string().max(128)}).strict().parse(body);await reauthenticate(session.user,data.password);
  if(!session.user.passwordHash)throw new HttpError(400,'יש להגדיר סיסמה לפני ניתוק Google.');
  await db.accountIdentity.deleteMany({where:{userId:session.userId,provider:'google'}});await audit({userId:session.userId,action:'GOOGLE_UNLINKED'});return NextResponse.json({ok:true});
 }
 if(action==='delete'){
  const data=z.object({password:z.string().max(128),confirm:z.literal('מחיקת החשבון')}).strict().parse(body);await reauthenticate(session.user,data.password);
  if(session.user.role==='admin')throw new HttpError(400,'חשבון האדמין היחיד אינו נמחק במסלול הרגיל.');
  await db.$transaction(async tx=>{await tx.user.update({where:{id:session.userId},data:{status:'pending_deletion',deletionRequestedAt:new Date()}});await tx.pushSubscription.updateMany({where:{userId:session.userId},data:{enabled:false}});await tx.session.deleteMany({where:{userId:session.userId}});});await audit({userId:session.userId,action:'DELETION_REQUESTED'});await deleteSession();return NextResponse.json({ok:true});
 }
 if(action==='logout-all'){await revokeAccountSessions(session.userId);await deleteSession();return NextResponse.json({ok:true});}
 throw new HttpError(404,'לא נמצא.');
}catch(error){return apiError(error);}}
