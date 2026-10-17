import {db} from './db';
import {HttpError} from './http';
import {parseContract} from './work-validation';
export async function activeEmployment(userId:string,selectedId?:string|null){
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  let employment=await tx.employment.findFirst({where:selectedId?{id:selectedId,userId}:{userId,archivedAt:null}});
  if(selectedId&&!employment)throw new HttpError(404,'מקום העבודה לא נמצא.');
  if(employment?.archivedAt)throw new HttpError(409,'מקום העבודה בארכיון. ההיסטוריה זמינה לקריאה.');
  if(!employment){employment=await tx.employment.create({data:{userId,name:'מקום העבודה שלי'}});const settings=await tx.workSettings.findUnique({where:{userId}});await tx.workContractVersion.create({data:{userId,employmentId:employment.id,effectiveFrom:new Date('1900-01-01'),contract:parseContract(settings?.contract)}});}
  return employment;
 });
}
export async function saveContractVersion(userId:string,employmentId:string,effectiveFrom:string,contract:ReturnType<typeof parseContract>,today:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(effectiveFrom)||effectiveFrom<`${today.slice(0,7)}-01`)throw new HttpError(400,'תנאים חדשים נכנסים לתוקף בתחילת החודש הנוכחי או חודש עתידי. חודשים קודמים נשמרים.');
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  if(!await tx.employment.findFirst({where:{id:employmentId,userId,archivedAt:null}}))throw new HttpError(409,'מקום העבודה אינו פעיל.');
  await tx.workContractVersion.upsert({where:{employmentId_effectiveFrom:{employmentId,effectiveFrom:new Date(effectiveFrom)}},create:{userId,employmentId,effectiveFrom:new Date(effectiveFrom),contract},update:{contract}});
  if(effectiveFrom<=today)await tx.workSettings.upsert({where:{userId},create:{userId,contract},update:{contract}});
  await tx.auditEvent.create({data:{userId,action:'WORK_CONTRACT_VERSION_SAVED',entityType:'EMPLOYMENT',entityId:employmentId,changedFields:['contract'],metadata:{effectiveFrom}}});
 });
}
