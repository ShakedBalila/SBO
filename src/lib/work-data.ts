import {db} from './db';
import {parseContract} from './work-validation';
import {dayKey,type WorkData,type WorkTripRow} from './work-calculations';
export async function workData(userId:string,timezone:string):Promise<WorkData>{
  const [settings,entries,trips,expenses,documents]=await Promise.all([
    db.workSettings.findUnique({where:{userId}}),db.workEntry.findMany({where:{userId},orderBy:[{date:'desc'},{startedAt:'desc'}]}),db.workTrip.findMany({where:{userId},orderBy:{startDate:'desc'}}),db.workExpense.findMany({where:{userId},orderBy:{date:'desc'}}),db.workDocument.findMany({where:{userId},select:{id:true,tripId:true,entryId:true,name:true,category:true,mimeType:true,size:true,createdAt:true},orderBy:{createdAt:'desc'}})
  ]);
  return {contract:parseContract(settings?.contract),today:dayKey(new Date(),timezone),timezone,
    entries:entries.map(row=>({...row,date:row.date.toISOString().slice(0,10),startedAt:row.startedAt?.toISOString()??null,endedAt:row.endedAt?.toISOString()??null,pausedAt:row.pausedAt?.toISOString()??null,distanceKm:Number(row.distanceKm)})),
    trips:trips.map(row=>({id:row.id,destination:row.destination,startDate:row.startDate.toISOString().slice(0,10),endDate:row.endDate.toISOString().slice(0,10),status:row.status,details:row.details as WorkTripRow['details']})),
    expenses:expenses.map(row=>({...row,date:row.date.toISOString().slice(0,10),rateDate:row.rateDate.toISOString().slice(0,10),amount:Number(row.amount),exchangeRate:Number(row.exchangeRate)})),
    documents:documents.map(row=>({...row,createdAt:row.createdAt.toISOString()}))};
}
