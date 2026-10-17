import {db} from './db';
import {HttpError} from './http';
export async function changeVehicle(userId:string,id:string,action:'primary'|'archive'|'restore'){
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  const vehicle=await tx.vehicle.findFirst({where:{id,userId}});if(!vehicle)throw new HttpError(404,'הרכב לא נמצא.');
  if(action==='primary'){if(vehicle.archivedAt)throw new HttpError(400,'יש לשחזר רכב לפני הגדרתו כראשי.');await tx.vehicle.updateMany({where:{userId,isPrimary:true},data:{isPrimary:false}});await tx.vehicle.update({where:{id},data:{isPrimary:true}});}
  else if(action==='archive')await tx.vehicle.update({where:{id},data:{archivedAt:new Date(),isPrimary:false}});
  else await tx.vehicle.update({where:{id},data:{archivedAt:null,remindersResumedAt:new Date()}});
  if(!await tx.vehicle.findFirst({where:{userId,archivedAt:null,isPrimary:true}})){const first=await tx.vehicle.findFirst({where:{userId,archivedAt:null},orderBy:[{createdAt:'asc'},{id:'asc'}]});if(first)await tx.vehicle.update({where:{id:first.id},data:{isPrimary:true}});}
 });
}
