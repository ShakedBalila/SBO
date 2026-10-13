import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentSession} from '@/lib/auth';
import {db} from '@/lib/db';
import {audit} from '@/lib/audit';
import {apiError,checkOrigin,HttpError,jsonBody} from '@/lib/http';
import {hashPassword,verifyPassword} from '@/lib/password';

function device(value:string){
  if(!value)return 'מכשיר לא מזוהה';
  const os=/iPhone|iPad/.test(value)?'iPhone / iPad':/Android/.test(value)?'Android':/Windows/.test(value)?'Windows':/Mac OS/.test(value)?'Mac':'מכשיר';
  const browser=/Edg\//.test(value)?'Edge':/CriOS|Chrome\//.test(value)?'Chrome':/Firefox\//.test(value)?'Firefox':/Safari\//.test(value)?'Safari':'דפדפן';
  return `${browser} · ${os}`;
}
async function owner(){const session=await currentSession();if(!session)throw new HttpError(401,'יש להתחבר מחדש.');return session;}
export async function GET(){try{const session=await owner(),rows=await db.session.findMany({where:{userId:session.userId,expiresAt:{gt:new Date()}},orderBy:{lastSeenAt:'desc'},select:{id:true,createdAt:true,lastSeenAt:true,expiresAt:true,userAgent:true}});return NextResponse.json({sessions:rows.map(row=>({...row,device:device(row.userAgent),current:row.id===session.id}))},{headers:{'Cache-Control':'private, no-store'}});}catch(error){return apiError(error);}}
export async function POST(request:Request,context:{params:Promise<{action:string}>}){try{checkOrigin(request);const session=await owner(),{action}=await context.params;
 if(action==='password'){const body=z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(12,'הסיסמה החדשה צריכה להכיל לפחות 12 תווים.').max(128)}).strict().parse(await jsonBody(request));if(!await verifyPassword(body.currentPassword,session.user.passwordHash))throw new HttpError(400,'הסיסמה הנוכחית שגויה.');await db.user.update({where:{id:session.userId},data:{passwordHash:await hashPassword(body.newPassword)}});await db.session.deleteMany({where:{userId:session.userId,id:{not:session.id}}});await audit({userId:session.userId,action:'PASSWORD_CHANGED',entityType:'ACCOUNT',sessionId:session.id});return NextResponse.json({ok:true});}
 if(action==='revoke-others'){const result=await db.session.deleteMany({where:{userId:session.userId,id:{not:session.id}}});await audit({userId:session.userId,action:'SESSIONS_REVOKED',entityType:'SESSION',sessionId:session.id,metadata:{count:result.count}});return NextResponse.json({ok:true,count:result.count});}
 if(action==='revoke'){const body=z.object({id:z.string().min(1)}).strict().parse(await jsonBody(request));if(body.id===session.id)throw new HttpError(400,'כדי לסיים את הסשן הנוכחי יש להתנתק.');const result=await db.session.deleteMany({where:{id:body.id,userId:session.userId}});if(!result.count)throw new HttpError(404,'הסשן לא נמצא.');await audit({userId:session.userId,action:'SESSION_REVOKED',entityType:'SESSION',entityId:body.id,sessionId:session.id});return NextResponse.json({ok:true});}
 throw new HttpError(404,'הפעולה לא נמצאה.');
}catch(error){return apiError(error);}}
