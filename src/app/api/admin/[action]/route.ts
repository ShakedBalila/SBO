import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {apiError,checkOrigin,HttpError,jsonBody} from '@/lib/http';
import {adminSession,accountLimit,secretToken,tokenHash,appOrigin,reauthenticate} from '@/lib/account-security';
import {mailConfigured,sendAccountMail} from '@/lib/account-mail';
type Context={params:Promise<{action:string}>};
export async function GET(request:Request,context:Context){try{
 await adminSession();const {action}=await context.params,url=new URL(request.url),page=Math.max(0,Math.min(10000,Number(url.searchParams.get('page'))||0));
 if(action==='users'){const query=(url.searchParams.get('q')??'').slice(0,100);return NextResponse.json({rows:await db.user.findMany({where:query?{OR:[{name:{contains:query,mode:'insensitive'}},{email:{contains:query,mode:'insensitive'}}]}:{},select:{id:true,name:true,email:true,role:true,status:true,createdAt:true,sessions:{select:{lastSeenAt:true},orderBy:{lastSeenAt:'desc'},take:1}},orderBy:{createdAt:'desc'},skip:page*30,take:30})},{headers:{'Cache-Control':'private, no-store'}});}
 if(action==='invitations')return NextResponse.json({rows:await db.invitation.findMany({select:{id:true,email:true,createdAt:true,expiresAt:true,usedAt:true,revokedAt:true,deliveryState:true},orderBy:{createdAt:'desc'},skip:page*30,take:30}),mailConfigured:mailConfigured()},{headers:{'Cache-Control':'private, no-store'}});
 if(action==='audit')return NextResponse.json({rows:await db.auditEvent.findMany({where:{action:{in:['INVITATION_CREATED','INVITATION_REVOKED','ACCOUNT_SUSPENDED','ACCOUNT_REACTIVATED','DELETION_REQUESTED','DELETION_CANCELLED','ADMIN_PROVISIONED','ACCOUNT_REGISTERED','GOOGLE_LINKED','GOOGLE_UNLINKED','PASSWORD_CHANGED','PASSWORD_RESET','EMAIL_VERIFIED']}},select:{id:true,userId:true,action:true,entityId:true,outcome:true,occurredAt:true},orderBy:{occurredAt:'desc'},skip:page*30,take:30})},{headers:{'Cache-Control':'private, no-store'}});
 throw new HttpError(404,'לא נמצא.');
}catch(error){return apiError(error);}}
export async function POST(request:Request,context:Context){try{
 checkOrigin(request);const session=await adminSession(),{action}=await context.params;await accountLimit(`admin:${session.userId}`,30);const body=await jsonBody(request);
 if(action==='invite'){
  const value=z.object({email:z.email().max(254).transform(v=>v.trim().toLowerCase()),confirmEmail:z.email().max(254).transform(v=>v.trim().toLowerCase()),sendEmail:z.boolean().default(false)}).strict().parse(body);
  if(value.email!==value.confirmEmail)throw new HttpError(400,'כתובות המייל אינן תואמות.');if(value.sendEmail&&!mailConfigured())throw new HttpError(503,'שליחת מיילים עדיין לא מחוברת. אפשר ליצור קישור לשיתוף.');
  if(await db.user.findUnique({where:{email:value.email}}))throw new HttpError(409,'כבר קיים חשבון עם כתובת המייל הזו.');
  const raw=secretToken(),row=await db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${value.email}))`;
   await tx.invitation.updateMany({where:{email:value.email,usedAt:null,revokedAt:null},data:{revokedAt:new Date()}});
   const row=await tx.invitation.create({data:{email:value.email,issuerId:session.userId,tokenHash:tokenHash(raw),expiresAt:new Date(Date.now()+72*3600000)}});
   await tx.auditEvent.create({data:{userId:session.userId,action:'INVITATION_CREATED',entityType:'INVITATION',entityId:row.id}});return row;
  });
  const path=`/invite#token=${raw}`;let deliveryState='created';
  if(value.sendEmail){try{await sendAccountMail(value.email,'הוזמנת להצטרף ל־SBO','הזמנה אישית ל־SBO. ההזמנה תקפה ל־72 שעות ומיועדת לכתובת המייל שלך בלבד.',path);deliveryState='provider_accepted';}catch{deliveryState='failed';}await db.invitation.update({where:{id:row.id},data:{deliveryState}});}
  return NextResponse.json({id:row.id,url:`${appOrigin()}${path}`,expiresAt:row.expiresAt,deliveryState},{headers:{'Cache-Control':'no-store'}});
 }
 if(action==='revoke-invite'){
  const value=z.object({id:z.string()}).strict().parse(body);await db.$transaction(async tx=>{const result=await tx.invitation.updateMany({where:{id:value.id,usedAt:null,revokedAt:null},data:{revokedAt:new Date()}});if(!result.count)throw new HttpError(404,'לא נמצאה הזמנה פעילה.');await tx.auditEvent.create({data:{userId:session.userId,action:'INVITATION_REVOKED',entityId:value.id}});});return NextResponse.json({ok:true});
 }
 if(action==='status'){
  const value=z.object({id:z.string(),status:z.enum(['active','suspended','pending_deletion']),password:z.string().max(128),confirm:z.string().default('')}).strict().parse(body);await reauthenticate(session.user,value.password);if(value.status==='pending_deletion'&&value.confirm!=='מחיקת החשבון')throw new HttpError(400,'יש לאשר במפורש את בקשת המחיקה.');
  await db.$transaction(async tx=>{
   const target=await tx.user.findUnique({where:{id:value.id}});if(!target||target.role==='admin')throw new HttpError(400,'לא ניתן לשנות את החשבון הזה.');
   if(target.status==='pending_deletion'||target.status==='deleted'||target.status===value.status)throw new HttpError(409,'מעבר המצב אינו מותר. ביטול מחיקה נעשה על ידי בעל החשבון.');
   await tx.user.update({where:{id:target.id},data:{status:value.status,deletionRequestedAt:value.status==='pending_deletion'?new Date():null}});
   if(value.status!=='active'){await tx.session.deleteMany({where:{userId:target.id}});await tx.pushSubscription.updateMany({where:{userId:target.id},data:{enabled:false}});}
   await tx.auditEvent.create({data:{userId:session.userId,action:value.status==='active'?'ACCOUNT_REACTIVATED':value.status==='suspended'?'ACCOUNT_SUSPENDED':'DELETION_REQUESTED',entityType:'ACCOUNT',entityId:target.id}});
  });return NextResponse.json({ok:true});
 }
 throw new HttpError(404,'לא נמצא.');
}catch(error){return apiError(error);}}
