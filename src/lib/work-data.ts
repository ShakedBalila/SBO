import {db} from './db';
import {HttpError} from './http';
import {parseContract} from './work-validation';
import {dayKey,parseBreakSegments,type WorkData,type WorkTripRow} from './work-calculations';
export async function workData(userId:string,timezone:string,selectedId?:string|null):Promise<WorkData>{
  const employments=await db.employment.findMany({where:{userId},orderBy:[{archivedAt:{sort:'asc',nulls:'first'}},{createdAt:'desc'}],include:{contracts:{orderBy:{effectiveFrom:'desc'}}}});
  const selected=selectedId?employments.find(e=>e.id===selectedId):employments.find(e=>!e.archivedAt),employmentId=selected?.id??null;
  if(selectedId&&!selected)throw new HttpError(404,'מקום העבודה לא נמצא.');
  const where={userId,employmentId},today=dayKey(new Date(),timezone),versions=selected?.contracts.map(v=>({effectiveFrom:v.effectiveFrom.toISOString().slice(0,10),contract:parseContract(v.contract)}))??[];
  const [settings,entries,trips,expenses,documents]=await Promise.all([
    db.workSettings.findUnique({where:{userId}}),db.workEntry.findMany({where,orderBy:[{date:'desc'},{startedAt:'desc'}]}),db.workTrip.findMany({where,orderBy:{startDate:'desc'}}),db.workExpense.findMany({where,orderBy:{date:'desc'}}),db.workDocument.findMany({where:{...where,uploadSize:null},select:{id:true,tripId:true,entryId:true,name:true,category:true,mimeType:true,size:true,createdAt:true,documentDate:true,payslipMonth:true},orderBy:{createdAt:'desc'}})
  ]);
  return {employments:employments.map(e=>({id:e.id,name:e.name,archivedAt:e.archivedAt?.toISOString()??null})),employmentId,archived:Boolean(selected?.archivedAt),contractVersions:versions,contract:versions.find(v=>v.effectiveFrom<=today)?.contract??parseContract(selected?settings?.contract:null),today,timezone,
    entries:entries.map(row=>({...row,breakSegments:parseBreakSegments(row.breakSegments),date:row.date.toISOString().slice(0,10),startedAt:row.startedAt?.toISOString()??null,endedAt:row.endedAt?.toISOString()??null,pausedAt:row.pausedAt?.toISOString()??null,distanceKm:Number(row.distanceKm)})),
    trips:trips.map(row=>({id:row.id,destination:row.destination,startDate:row.startDate.toISOString().slice(0,10),endDate:row.endDate.toISOString().slice(0,10),status:row.status,details:row.details as WorkTripRow['details']})),
    expenses:expenses.map(row=>({...row,date:row.date.toISOString().slice(0,10),rateDate:row.rateDate.toISOString().slice(0,10),amount:Number(row.amount),exchangeRate:Number(row.exchangeRate)})),
    documents:documents.map(row=>({...row,documentDate:row.documentDate?.toISOString().slice(0,10)??null,createdAt:row.createdAt.toISOString()}))};
}
