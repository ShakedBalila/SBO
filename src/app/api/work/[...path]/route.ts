import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {HttpError,apiError,checkOrigin,jsonBody} from '@/lib/http';
import {workData} from '@/lib/work-data';
import {dayKey,localInstant,parseBreakSegments} from '@/lib/work-calculations';
import {expenseInput,parseContract,timeOffInput,workContractInput,workEntryInput,workTripInput} from '@/lib/work-validation';
import {workRate} from '@/lib/work-rates';
import {recordDate} from '@/lib/modules';
import {workXlsx} from '@/lib/work-export';
import {audit} from '@/lib/audit';
type Context={params:Promise<{path:string[]}>};
function detectMime(content:Buffer){return content.subarray(0,5).toString()==='%PDF-'?'application/pdf':content[0]===255&&content[1]===216&&content[2]===255?'image/jpeg':content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':content.subarray(0,4).toString()==='RIFF'&&content.subarray(8,12).toString()==='WEBP'?'image/webp':null;}
const toDate=(date:string)=>new Date(`${date}T00:00:00Z`);
async function user(){const value=await currentUser();if(!value)throw new HttpError(401,'יש להתחבר לחשבון.');return value;}
async function ownTrip(userId:string,id:string|null){if(id&&!await db.workTrip.findFirst({where:{id,userId},select:{id:true}}))throw new HttpError(404,'הנסיעה לא נמצאה.');}
async function resolveTrip(userId:string,id:string|null,date:string,automatic:boolean){await ownTrip(userId,id);if(id||!automatic)return id;const trips=await db.workTrip.findMany({where:{userId,startDate:{lte:toDate(date)},endDate:{gte:toDate(date)}},select:{id:true},take:2});if(trips.length>1)throw new HttpError(400,'יש כמה נסיעות בתאריך הזה. יש לבחור שיוך לנסיעה.');return trips[0]?.id??null;}
async function ownDocument(userId:string,id:string|null){if(id&&!await db.workDocument.findFirst({where:{id,userId},select:{id:true}}))throw new HttpError(404,'המסמך לא נמצא.');}
export async function GET(request:Request,context:Context){try{
  const owner=await user(),[kind,id]= (await context.params).path;
  if(kind==='data')return NextResponse.json(await workData(owner.id,owner.settings?.timezone??'Asia/Jerusalem'),{headers:{'Cache-Control':'private, no-store'}});
  if(kind==='export'){const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(new URL(request.url).searchParams.get('month'));return new Response(new Uint8Array(workXlsx(await workData(owner.id,owner.settings?.timezone??'Asia/Jerusalem'),month)),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="SBO-hours-${month}.xlsx"`,'Cache-Control':'private, no-store'}});}
  if(kind==='rate'){const url=new URL(request.url);return NextResponse.json(await workRate(url.searchParams.get('currency')??'',url.searchParams.get('date')??''));}
  if(kind==='documents'&&id){
    const row=await db.workDocument.findFirst({where:{id,userId:owner.id,uploadSize:null}});if(!row)throw new HttpError(404,'המסמך לא נמצא.');
    if(!row.content)throw new HttpError(503,'המסמך נמצא בהעברה לאחסון פרטי.');
    const range=request.headers.get('range'),match=range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range&&!match)throw new HttpError(416,'טווח המסמך אינו תקין.');
    const start=match?Number(match[1]):0,end=match?Math.min(row.size-1,start+1024*1024-1,match[2]?Number(match[2]):Infinity):row.size-1;
    if(start>=row.size||end<start)throw new HttpError(416,'טווח המסמך אינו תקין.');
    if(!match&&row.size>4*1024*1024)throw new HttpError(413,'למסמך גדול יש להשתמש בכפתורי הצפייה או ההורדה במסך מסמכים.');
    void audit({userId:owner.id,action:'DOCUMENT_ACCESSED',entityType:'WORK_DOCUMENT',entityId:row.id});
    return new Response(new Uint8Array(row.content.subarray(start,end+1)),{status:match?206:200,headers:{'Content-Type':row.mimeType,'Content-Disposition':`${new URL(request.url).searchParams.get('download')==='1'?'attachment':'inline'}; filename="document"; filename*=UTF-8''${encodeURIComponent(row.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox",'Accept-Ranges':'bytes',...(match?{'Content-Range':`bytes ${start}-${end}/${row.size}`}:{})}});
  }
  throw new HttpError(404,'פעולה לא נמצאה.');
}catch(error){return apiError(error);}}
export async function POST(request:Request,context:Context){return mutate(request,context);}
export async function PATCH(request:Request,context:Context){return mutate(request,context);}
async function mutate(request:Request,context:Context){try{
  checkOrigin(request);const owner=await user(),userId=owner.id,timezone=owner.settings?.timezone??'Asia/Jerusalem',[kind,id]=(await context.params).path;
  if(kind==='documents'&&id==='init'){
    const value=z.object({name:z.string().min(1).max(200),size:z.number().int().min(1).max(10*1024*1024),mimeType:z.enum(['application/pdf','image/jpeg','image/png','image/webp']),category:z.enum(['CONTRACT','PAYSLIP','TRAVEL','TIME_OFF','RECEIPT','OTHER']),tripId:z.string().nullable().optional(),entryId:z.string().nullable().optional(),documentDate:recordDate.nullable().optional(),payslipMonth:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable().optional()}).strict().parse(await jsonBody(request));
    if(value.category==='PAYSLIP'&&!value.payslipMonth)throw new HttpError(400,'יש לבחור חודש ושנת תלוש.');
    await ownTrip(userId,value.tripId??null);let tripId=value.tripId??null;
    if(value.entryId){const entry=await db.workEntry.findFirst({where:{id:value.entryId,userId}});if(!entry)throw new HttpError(404,'הרשומה לא נמצאה.');tripId??=entry.tripId;}
    await db.workDocument.deleteMany({where:{userId,uploadSize:{not:null},createdAt:{lt:new Date(Date.now()-86400000)}}});
    const result=await db.workDocument.create({data:{userId,tripId,entryId:value.entryId??null,name:value.name.replace(/[\r\n\x00]/g,''),category:value.category,mimeType:value.mimeType,size:0,uploadSize:value.size,content:Buffer.alloc(0),documentDate:value.documentDate?toDate(value.documentDate):null,payslipMonth:value.category==='PAYSLIP'?value.payslipMonth:null},select:{id:true}});
    return NextResponse.json(result,{status:201});
  }
  if(kind==='documents'&&id&&request.method==='PATCH'){
    if(Number(request.headers.get('content-length')??0)>1200000)throw new HttpError(413,'חלק המסמך גדול מדי.');
    const form=await request.formData(),chunk=form.get('chunk'),offset=z.coerce.number().int().min(0).parse(form.get('offset'));
    if(!(chunk instanceof File)||!chunk.size||chunk.size>1024*1024)throw new HttpError(400,'חלק המסמך אינו תקין.');
    const bytes=Buffer.from(await chunk.arrayBuffer());
    await db.$transaction(async tx=>{
      const row=await tx.workDocument.findFirst({where:{id,userId,uploadSize:{not:null}}});if(!row)throw new HttpError(404,'העלאת המסמך לא נמצאה.');
      if(row.size!==offset||row.size+bytes.length>row.uploadSize!)throw new HttpError(409,'סדר חלקי המסמך אינו תקין. יש להעלות מחדש.');
      const content=Buffer.concat([row.content??Buffer.alloc(0),bytes]),done=content.length===row.uploadSize;
      if(done){const mime=detectMime(content);if(!mime||mime!==row.mimeType)throw new HttpError(400,'הקובץ אינו PDF או תמונה תקינים.');}
      const changed=await tx.workDocument.updateMany({where:{id,userId,size:offset,uploadSize:row.uploadSize},data:{content,size:content.length,uploadSize:done?null:row.uploadSize}});
      if(!changed.count)throw new HttpError(409,'המסמך עודכן במקביל.');
    });return NextResponse.json({ok:true});
  }
  if(kind==='documents'){
    if(Number(request.headers.get('content-length')??0)>3400000)throw new HttpError(413,'ניתן להעלות מסמך עד 3 MB.');
    const form=await request.formData(),file=form.get('file'),entryId=String(form.get('entryId')??'')||null;let tripId=String(form.get('tripId')??'')||null;
    const category=z.enum(['CONTRACT','PAYSLIP','TRAVEL','TIME_OFF','RECEIPT','OTHER']).parse(form.get('category'));
    if(!(file instanceof File)||file.size===0||file.size>3*1024*1024)throw new HttpError(400,'יש לבחור PDF או תמונה עד 3 MB.');
    const content=Buffer.from(await file.arrayBuffer());
    const mime=detectMime(content);
    if(!mime)throw new HttpError(400,'ניתן להעלות PDF, JPEG, PNG או WebP בלבד.');
    if(entryId){const entry=await db.workEntry.findFirst({where:{id:entryId,userId},select:{tripId:true}});if(!entry)throw new HttpError(404,'הרשומה לא נמצאה.');tripId??=entry.tripId;}await ownTrip(userId,tripId);
    const result=await db.workDocument.create({data:{userId,tripId,entryId,category,name:file.name.replace(/[\r\n\x00]/g,'').slice(0,200)||'מסמך',mimeType:mime,content,size:file.size},select:{id:true}});
    return NextResponse.json(result,{status:201});
  }
  const body=await jsonBody(request);
  if(kind==='settings'){const contract=workContractInput.parse(body);await db.workSettings.upsert({where:{userId},create:{userId,contract},update:{contract}});return NextResponse.json({ok:true});}
  if(kind==='clock'){
    const value=z.object({action:z.enum(['start','stop','pause','resume','type']),type:z.enum(['WORK','HOME','TRAVEL']).default('WORK'),tripId:z.string().nullable().default(null)}).strict().parse(body),now=new Date();await ownTrip(userId,value.tripId);
    const contract=parseContract((await db.workSettings.findUnique({where:{userId}}))?.contract);
    const result=await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const active=await tx.workEntry.findFirst({where:{userId,startedAt:{not:null},endedAt:null}});
      if(value.action==='start'){if(active)throw new HttpError(409,'כבר יש משמרת פעילה.');if(await tx.workEntry.findFirst({where:{userId,date:toDate(dayKey(now,timezone)),type:{in:['SICK','VACATION']}}}))throw new HttpError(409,'ביום הזה רשומה היעדרות מלאה. יש לתקן את רשומת ההיעדרות לפני התחלת עבודה.');return tx.workEntry.create({data:{userId,date:toDate(dayKey(now,timezone)),startedAt:now,type:value.type,tripId:value.tripId}});}
      if(!active)throw new HttpError(409,'אין משמרת פעילה.');
      if(value.action==='type')return tx.workEntry.update({where:{id:active.id},data:{type:value.type}});
      const segments=parseBreakSegments(active.breakSegments);
      if(value.action==='pause'){if(active.pausedAt)throw new HttpError(409,'ההפסקה כבר פעילה.');segments.push({startedAt:now.toISOString(),endedAt:null,paid:contract.paidBreaks});return tx.workEntry.update({where:{id:active.id},data:{pausedAt:now,breakSegments:segments}});}
      if(value.action==='resume'&&!active.pausedAt)throw new HttpError(409,'אין הפסקה פעילה.');
      const closedSeconds=segments.filter(s=>!s.paid&&s.endedAt).reduce((n,s)=>n+(Date.parse(s.endedAt!)-Date.parse(s.startedAt))/1000,0),legacy=Math.max(0,active.breakMinutes-Math.floor(closedSeconds/60));
      if(active.pausedAt){const segment=segments.find(s=>s.endedAt===null);if(segment)segment.endedAt=now.toISOString();else segments.push({startedAt:active.pausedAt.toISOString(),endedAt:now.toISOString(),paid:false});}
      const unpaidSeconds=segments.filter(s=>!s.paid&&s.endedAt).reduce((n,s)=>n+Math.max(0,(Date.parse(s.endedAt!)-Date.parse(s.startedAt))/1000),0);
      return tx.workEntry.update({where:{id:active.id},data:{breakMinutes:legacy+Math.floor(unpaidSeconds/60),breakSegments:segments,pausedAt:null,...(value.action==='stop'?{endedAt:now}:{})}});
    });await audit({userId,action:'WORK_CLOCK_'+value.action.toUpperCase(),entityType:'WORK_ENTRY',entityId:result.id});
    return NextResponse.json({id:result.id});
  }
  if(kind==='entries'){
    const value=workEntryInput.parse(body);value.tripId=await resolveTrip(userId,value.tripId,value.date,value.type==='TRAVEL');
    let startedAt:Date|null=null,endedAt:Date|null=null;
    try{if(value.startTime){startedAt=localInstant(value.date,value.startTime,timezone);endedAt=localInstant(value.endDate??value.date,value.endTime!,timezone);}}catch{throw new HttpError(400,'התאריך או השעה אינם תקינים באזור הזמן.');}
    if(startedAt&&endedAt&&(endedAt<=startedAt||endedAt.valueOf()-startedAt.valueOf()>48*3600000||value.breakMinutes>(endedAt.valueOf()-startedAt.valueOf())/60000))throw new HttpError(400,'יש לבדוק שעות כניסה, יציאה והפסקה (עד 48 שעות למשמרת).');
    if(startedAt&&endedAt&&await db.workEntry.findFirst({where:{userId,id:id?{not:id}:undefined,date:toDate(value.date),type:{in:['SICK','VACATION']}}}))throw new HttpError(409,'ביום הזה קיימת היעדרות מלאה. יש לתקן אותה לפני רישום עבודה.');
    if(startedAt&&endedAt){const overlap=await db.workEntry.findFirst({where:{userId,id:id?{not:id}:undefined,startedAt:{lt:endedAt},OR:[{endedAt:{gt:startedAt}},{endedAt:null}]}});if(overlap)throw new HttpError(409,'שעות העבודה חופפות למשמרת קיימת.');}
    const {startTime,endTime,endDate,...fields}=value;void startTime;void endTime;void endDate;
    const previous=id?await db.workEntry.findFirst({where:{id,userId}}):null;if(id&&!previous)throw new HttpError(404,'הרשומה לא נמצאה.');if(previous&&startedAt&&previous.startedAt&&Math.floor(startedAt.valueOf()/60000)===Math.floor(previous.startedAt.valueOf()/60000))startedAt=previous.startedAt;if(previous&&endedAt&&previous.endedAt&&Math.floor(endedAt.valueOf()/60000)===Math.floor(previous.endedAt.valueOf()/60000))endedAt=previous.endedAt;if(previous)await audit({userId,action:'WORK_ENTRY_CORRECTED',entityType:'WORK_ENTRY',entityId:id,metadata:{previous:JSON.stringify({startedAt:previous.startedAt,endedAt:previous.endedAt,breakMinutes:previous.breakMinutes,breakSegments:previous.breakSegments}),next:JSON.stringify({startedAt,endedAt,breakMinutes:value.breakMinutes})}});
    const data={...fields,date:toDate(value.date),startedAt,endedAt,pausedAt:null,...(previous&&(previous.startedAt?.valueOf()!==startedAt?.valueOf()||previous.endedAt?.valueOf()!==endedAt?.valueOf()||previous.breakMinutes!==value.breakMinutes)?{breakSegments:[]}:{} )};
    if(id){const result=await db.workEntry.updateMany({where:{id,userId},data});if(!result.count)throw new HttpError(404,'הרשומה לא נמצאה.');return NextResponse.json({id});}
    const result=await db.workEntry.create({data:{...data,userId}});return NextResponse.json({id:result.id},{status:201});
  }
  if(kind==='time-off'){
    const value=timeOffInput.parse(body),contract=parseContract((await db.workSettings.findUnique({where:{userId}}))?.contract),dates:Date[]=[];
    for(let stamp=Date.parse(value.startDate);stamp<=Date.parse(value.endDate);stamp+=86400000){const date=new Date(stamp);if(contract.workDays.includes(date.getUTCDay()))dates.push(date);}
    if(!dates.length)throw new HttpError(400,'אין ימי עבודה בטווח שבחרת.');
    const result=await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;if(await tx.workEntry.findFirst({where:{userId,date:{in:dates},startedAt:{not:null}}}))throw new HttpError(409,'קיימות שעות עבודה ביום שבחרת. יש לתקן אותן לפני רישום היעדרות מלאה.');if(await tx.workEntry.findFirst({where:{userId,date:{in:dates},type:{in:['SICK','VACATION']}}}))throw new HttpError(409,'כבר הוזנה חופשה או מחלה בחלק מהימים.');const ids=[];for(const date of dates){const row=await tx.workEntry.create({data:{userId,date,type:value.type,notes:value.notes}});ids.push(row.id);}return ids;},{isolationLevel:'Serializable'});
    return NextResponse.json({id:result[0],ids:result},{status:201});
  }
  if(kind==='trips'){
    const value=workTripInput.parse(body);let rate=value.perDiemExchangeRate;if(rate===null&&value.perDiem>0){try{rate=(await workRate(value.perDiemCurrency,value.startDate)).exchangeRate;}catch{rate=null;}}const {destination,startDate,endDate,status,...details}=value;details.perDiemExchangeRate=rate;const data={destination,startDate:toDate(startDate),endDate:toDate(endDate),status,details};
    if(id){const result=await db.workTrip.updateMany({where:{id,userId},data});if(!result.count)throw new HttpError(404,'הנסיעה לא נמצאה.');return NextResponse.json({id});}
    const result=await db.workTrip.create({data:{...data,userId}});return NextResponse.json({id:result.id},{status:201});
  }
  if(kind==='expenses'){
    const value=expenseInput.parse(body);value.tripId=await resolveTrip(userId,value.tripId,value.date,value.currency!=='ILS');await ownDocument(userId,value.documentId);
    const rate=value.currency==='ILS'?{exchangeRate:1,rateDate:value.date,rateSource:'ILS'}:value.exchangeRate!==null?{exchangeRate:value.exchangeRate,rateDate:value.date,rateSource:'ידני'}:await workRate(value.currency,value.date);
    const data={...value,...rate,date:toDate(value.date),rateDate:toDate(rate.rateDate)};
    const result=await db.$transaction(async tx=>{let savedId=id;if(id){const updated=await tx.workExpense.updateMany({where:{id,userId},data});if(!updated.count)throw new HttpError(404,'ההוצאה לא נמצאה.');}else savedId=(await tx.workExpense.create({data:{...data,userId}})).id;if(value.documentId&&value.tripId)await tx.workDocument.updateMany({where:{id:value.documentId,userId,tripId:null},data:{tripId:value.tripId}});return savedId;});return NextResponse.json({id:result},{status:id?200:201});
  }
  throw new HttpError(404,'פעולה לא נמצאה.');
}catch(error){if(error&&typeof error==='object'&&'code' in error&&['P2002','P2034'].includes(String(error.code)))return apiError(new HttpError(409,'הרשומה עודכנה במקביל. יש לרענן ולנסות שוב.'));return apiError(error);}}
export async function DELETE(request:Request,context:Context){try{
  checkOrigin(request);const owner=await user(),userId=owner.id,[kind,id]=(await context.params).path;if(!id)throw new HttpError(400,'חסר מזהה.');
  let count=0;
  if(kind==='entries'){count=(await db.workEntry.deleteMany({where:{id,userId}})).count;await db.workDocument.updateMany({where:{userId,entryId:id},data:{entryId:null}});}
  else if(kind==='expenses')count=(await db.workExpense.deleteMany({where:{id,userId}})).count;
  else if(kind==='documents'){count=(await db.workDocument.deleteMany({where:{id,userId}})).count;await db.workExpense.updateMany({where:{userId,documentId:id},data:{documentId:null}});}
  else if(kind==='trips')count=await db.$transaction(async tx=>{await tx.workEntry.updateMany({where:{userId,tripId:id},data:{tripId:null}});await tx.workExpense.updateMany({where:{userId,tripId:id},data:{tripId:null}});await tx.workDocument.updateMany({where:{userId,tripId:id},data:{tripId:null}});return(await tx.workTrip.deleteMany({where:{id,userId}})).count;});
  else throw new HttpError(404,'פעולה לא נמצאה.');
  if(!count)throw new HttpError(404,'הרשומה לא נמצאה.');return NextResponse.json({ok:true});
}catch(error){return apiError(error);}}
