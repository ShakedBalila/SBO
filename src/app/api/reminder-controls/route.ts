import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {accountSession} from '@/lib/account-security';
import {reminderRows} from '@/lib/reminder-controls';
import {apiError,checkOrigin,jsonBody,HttpError} from '@/lib/http';
export async function GET(){try{const {userId}=await accountSession();return NextResponse.json(await reminderRows(userId),{headers:{'Cache-Control':'no-store'}});}catch(error){return apiError(error);}}
export async function POST(request:Request){try{
 checkOrigin(request);const {userId}=await accountSession(),body=z.object({source:z.enum(['master','water','creatine','task','event','policy','test','service']),sourceId:z.string().optional(),enabled:z.boolean(),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),end:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),interval:z.number().int().min(15).max(720).optional(),lead:z.number().int().min(0).max(10080).optional()}).strict().parse(await jsonBody(request));
 if(body.source==='master'){await db.userSettings.upsert({where:{userId},create:{userId,notificationsEnabled:body.enabled,...(body.enabled?{notificationsResumedAt:new Date()}:{})},update:{notificationsEnabled:body.enabled,...(body.enabled?{notificationsResumedAt:new Date()}:{})}});return NextResponse.json({ok:true});}
 const rows=await reminderRows(userId),row=rows.rows.find(r=>r.source===body.source&&r.sourceId===body.sourceId);if(!row)throw new HttpError(404,'התזכורת לא נמצאה.');
 await db.$transaction(async tx=>{
  if(body.source==='water'){const start=body.time??row.time,end=body.end??('end'in row?row.end:'16:00');if(!end||end<=start)throw new HttpError(400,'שעת הסיום חייבת להיות אחרי ההתחלה.');await tx.userSettings.update({where:{userId},data:{waterReminderEnabled:body.enabled,waterReminderStart:start,waterReminderEnd:end,...(body.interval?{waterReminderIntervalMinutes:body.interval}:{})}});}
  else if(body.source==='creatine')await tx.userSettings.update({where:{userId},data:{creatineReminderEnabled:body.enabled,...(body.time?{creatineReminderTime:body.time}:{})}});
  else if(body.source==='task'||body.source==='event'){
   // Reminder lead changes never shift the underlying task/event occurrence.
   const data=body.lead!==undefined?{reminderMinutes:body.lead}:{};
   if(body.source==='task')await tx.task.updateMany({where:{id:body.sourceId,userId},data});else await tx.calendarEvent.updateMany({where:{id:body.sourceId,userId},data});
  }else{
   if(body.lead!==undefined&&body.lead>365)throw new HttpError(400,'אפשר לבחור עד 365 ימים לפני.');const data={...(body.time?{reminderTime:body.time}:{}),...(body.lead!==undefined?{reminderDays:body.lead}:{})};
   if(body.source==='policy')await tx.vehiclePolicy.updateMany({where:{id:body.sourceId,userId},data});
   if(body.source==='test')await tx.vehicleReminder.updateMany({where:{id:body.sourceId,userId},data});
   if(body.source==='service')await tx.vehicleExpense.updateMany({where:{id:body.sourceId,userId},data});
   if(body.enabled)await tx.userSettings.update({where:{userId},data:{vehicleReminderEnabled:true}});
  }
  await tx.reminderOverride.upsert({where:{userId_source_sourceId:{userId,source:body.source,sourceId:row.sourceId}},create:{userId,source:body.source,sourceId:row.sourceId,enabled:body.enabled,resumedAt:body.enabled?new Date():null},update:{enabled:body.enabled,pauseReason:null,...(body.enabled?{resumedAt:new Date()}:{})}});
 });return NextResponse.json({ok:true});
}catch(error){return apiError(error);}}
