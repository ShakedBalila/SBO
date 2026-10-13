import type {Prisma} from '@/generated/prisma/client';
import {HttpError} from './http';
import {shiftDate} from './workouts';
export async function syncWorkoutSources(tx:Prisma.TransactionClient,userId:string,sessionId:string,localDate:string){
 const links=await tx.workoutLink.findMany({where:{userId,original:{path:['linkedSessionId'],equals:sessionId}}});
 for(const link of links){
  if(link.sourceKind==='task'){const row=await tx.task.findFirst({where:{id:link.sourceId,userId}});if(!row)continue;if(row.recurrence!=='NONE')throw new HttpError(409,'סדרת אימונים קיימת נשמרת ללא שינוי. יש לבחור רשומה חד־פעמית לשיוך לאימון מסוים.');const duration=row.startDate&&row.endDate?Math.max(0,Math.round((row.endDate.valueOf()-row.startDate.valueOf())/86400000)):0;await tx.task.updateMany({where:{id:row.id,userId},data:{startDate:new Date(localDate),endDate:row.endDate?new Date(shiftDate(localDate,duration)):null}});}
  else{const row=await tx.calendarEvent.findFirst({where:{id:link.sourceId,userId}});if(!row)continue;if(row.recurrence!=='NONE')throw new HttpError(409,'סדרת אירועים נשמרת ללא שינוי.');const duration=row.endDate?Math.max(0,Math.round((row.endDate.valueOf()-row.date.valueOf())/86400000)):0;await tx.calendarEvent.updateMany({where:{id:row.id,userId},data:{date:new Date(localDate),endDate:row.endDate?new Date(shiftDate(localDate,duration)):null}});}
  await tx.workoutLink.updateMany({where:{id:link.id,userId},data:{localDate}});
 }
}
