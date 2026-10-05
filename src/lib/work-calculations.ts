export const workDefaults = {
  baseSalary:16000, standardMinutes:504, defaultBreakMinutes:30, monthlyHours:182,
  contributionBasePercent:90, mealPerDay:37, travelAllowance:500,
  vacationDays:15, vacationCarryover:0, sickEntitlement:0, sickPayPercent:100,
  employeePensionPercent:6, employerPensionPercent:6.5, severancePercent:8.3,
  employeeTrainingPercent:2.5, employerTrainingPercent:7.5,
  overtimeFirstMinutes:120, overtimeFirstPercent:125, overtimeNextPercent:150,
  workDays:[0,1,2,3,4]
};
export type WorkContract = typeof workDefaults;
export type WorkEntryRow = {id:string;date:string;type:string;startedAt:string|null;endedAt:string|null;breakMinutes:number;pausedAt:string|null;overtimeApproved:boolean;distanceKm:number;notes:string;tripId:string|null};
export type WorkTripRow = {id:string;destination:string;startDate:string;endDate:string;status:string;details:Record<string,string|number>};
export type WorkExpenseRow = {id:string;tripId:string|null;date:string;category:string;amount:number;currency:string;exchangeRate:number;rateDate:string;rateSource:string;paymentSource:string;reimbursable:boolean;paid:boolean;notes:string;documentId:string|null};
export type WorkDocumentRow = {id:string;tripId:string|null;entryId:string|null;name:string;category:string;mimeType:string;size:number;createdAt:string};
export type WorkData = {contract:WorkContract;entries:WorkEntryRow[];trips:WorkTripRow[];expenses:WorkExpenseRow[];documents:WorkDocumentRow[];today:string;timezone:string};
export const workTypes:Record<string,string> = {WORK:'עבודה',HOME:'עבודה מהבית',TRAVEL:'נסיעה',SICK:'מחלה',VACATION:'חופשה',OTHER:'אחר'};
export const workClock=(minutes:number)=>`${Math.floor(Math.max(0,minutes)/60)}:${String(Math.floor(Math.max(0,minutes)%60)).padStart(2,'0')}`;
export function dayKey(date:Date,timezone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function shiftMinutes(entry:WorkEntryRow,now=Date.now()) {
  if(!entry.startedAt)return 0;
  const end=entry.pausedAt?Date.parse(entry.pausedAt):entry.endedAt?Date.parse(entry.endedAt):now;
  return Math.max(0,Math.floor((end-Date.parse(entry.startedAt))/60000)-entry.breakMinutes);
}
export function monthDays(month:string){const start=new Date(`${month}-01T00:00:00Z`),last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();return Array.from({length:last},(_,index)=>`${month}-${String(index+1).padStart(2,'0')}`);}
export function monthSummary(entries:WorkEntryRow[],month:string,contract:WorkContract,now=Date.now()){
  const rows=entries.filter(entry=>entry.date.startsWith(month));
  const days=monthDays(month).map(date=>{
    const day=rows.filter(entry=>entry.date===date),shifts=day.filter(entry=>entry.startedAt).sort((a,b)=>Date.parse(a.startedAt!)-Date.parse(b.startedAt!));
    let minutes=0,approvedFirst=0,approvedNext=0;
    for(const shift of shifts){const next=minutes+shiftMinutes(shift,now),from=Math.max(0,minutes-contract.standardMinutes),to=Math.max(0,next-contract.standardMinutes);if(shift.overtimeApproved){approvedFirst+=Math.max(0,Math.min(to,contract.overtimeFirstMinutes)-Math.min(from,contract.overtimeFirstMinutes));approvedNext+=Math.max(0,to-contract.overtimeFirstMinutes)-Math.max(0,from-contract.overtimeFirstMinutes);}minutes=next;}
    return {date,minutes,regular:Math.min(minutes,contract.standardMinutes),overtime:Math.max(0,minutes-contract.standardMinutes),approvedFirst,approvedNext,sick:day.some(entry=>entry.type==='SICK'),vacation:day.some(entry=>entry.type==='VACATION'),travel:day.some(entry=>entry.type==='TRAVEL'),worked:minutes>0};
  });
  const minutes=days.reduce((sum,day)=>sum+day.minutes,0),approvedFirst=days.reduce((sum,day)=>sum+day.approvedFirst,0),approvedNext=days.reduce((sum,day)=>sum+day.approvedNext,0),workedDays=days.filter(day=>day.worked).length,hourly=contract.baseSalary/contract.monthlyHours;
  const overtimePay=hourly/60*(approvedFirst*contract.overtimeFirstPercent/100+approvedNext*contract.overtimeNextPercent/100),meals=workedDays*contract.mealPerDay;
  const socialBase=contract.baseSalary*contract.contributionBasePercent/100,sickDays=days.filter(day=>day.sick).length;
  const sickAdjustment=sickDays*contract.standardMinutes/60*hourly*(contract.sickPayPercent/100-1);
  return {days,minutes,workedDays,approvedMinutes:approvedFirst+approvedNext,overtimePay,meals,sickAdjustment,gross:contract.baseSalary+overtimePay+contract.travelAllowance+sickAdjustment,socialBase,sickDays,vacationDays:days.filter(day=>day.vacation).length};
}
// Interpret wall-clock fields in the user's timezone; reject nonexistent DST times.
export function localInstant(date:string,time:string,timezone:string){
  const target=Date.parse(`${date}T${time}:00Z`);let value=target;
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(let i=0;i<4;i++){const p=Object.fromEntries(formatter.formatToParts(new Date(value)).map(part=>[part.type,part.value]));const rendered=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);const delta=target-rendered;if(delta===0)return new Date(value);value+=delta;}
  throw new Error('השעה אינה קיימת באזור הזמן שנבחר.');
}
