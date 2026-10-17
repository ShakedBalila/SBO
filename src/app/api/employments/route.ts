import {z} from 'zod';
import {db} from '@/lib/db';
import {accountSession} from '@/lib/account-security';
import {apiError,checkOrigin,jsonBody,HttpError} from '@/lib/http';
import {workDefaults} from '@/lib/work-calculations';
export async function POST(request:Request){try{
 checkOrigin(request);const {userId}=await accountSession(),body=z.discriminatedUnion('action',[
  z.object({action:z.literal('create'),name:z.string().trim().min(1).max(150),archiveCurrent:z.boolean().default(false)}).strict(),
  z.object({action:z.literal('archive'),id:z.string()}).strict(),z.object({action:z.literal('rename'),id:z.string(),name:z.string().trim().min(1).max(150)}).strict()
 ]).parse(await jsonBody(request));
 const result=await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  if(body.action==='rename'){const r=await tx.employment.updateMany({where:{id:body.id,userId},data:{name:body.name}});if(!r.count)throw new HttpError(404,'מקום העבודה לא נמצא.');return body.id;}
  if(await tx.workEntry.findFirst({where:{userId,startedAt:{not:null},endedAt:null}}))throw new HttpError(409,'יש לסיים משמרת פעילה לפני החלפת מקום עבודה.');
  const active=await tx.employment.findFirst({where:{userId,archivedAt:null}});
  if(body.action==='archive'){if(active?.id!==body.id)throw new HttpError(404,'מקום העבודה הפעיל לא נמצא.');await tx.employment.update({where:{id:body.id},data:{archivedAt:new Date()}});return body.id;}
  if(active&&!body.archiveCurrent)throw new HttpError(409,'יש לאשר העברת מקום העבודה הנוכחי לארכיון.');
  if(active)await tx.employment.update({where:{id:active.id},data:{archivedAt:new Date()}});
  const e=await tx.employment.create({data:{userId,name:body.name}});
  await tx.workContractVersion.create({data:{userId,employmentId:e.id,effectiveFrom:new Date('1900-01-01'),contract:workDefaults}});
  await tx.workSettings.upsert({where:{userId},create:{userId,contract:workDefaults},update:{contract:workDefaults}});
  await tx.auditEvent.create({data:{userId,action:'EMPLOYMENT_CREATED',entityId:e.id}});return e.id;
 });return Response.json({id:result});
}catch(error){return apiError(error);}}
