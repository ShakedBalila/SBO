export const workDefaults = {
  baseSalary:0, standardMinutes:480, defaultBreakMinutes:0, monthlyHours:182, paidBreaks:false,
  contributionBasePercent:0, mealPerDay:0, travelAllowance:0,
  vacationDays:0, vacationCarryover:0, sickEntitlement:0, sickPayPercent:0,
  employeePensionPercent:0, employerPensionPercent:0, severancePercent:0,
  employeeTrainingPercent:0, employerTrainingPercent:0,
  overtimeFirstMinutes:120, overtimeFirstPercent:125, overtimeNextPercent:150,
  workDays:[0,1,2,3,4], employmentStartDate:null as string|null, employmentEndDate:null as string|null,
  prorationMode:'workingDays' as 'workingDays'|'calendarDays', prorateTravel:true,
  vacationAccrual:'monthly' as 'monthly'|'annual'
};
export type WorkContract = typeof workDefaults;
export type WorkBreakSegment={startedAt:string;endedAt:string|null;paid:boolean};
export type WorkEntryRow = {id:string;date:string;type:string;startedAt:string|null;endedAt:string|null;breakMinutes:number;pausedAt:string|null;breakSegments?:WorkBreakSegment[];overtimeApproved:boolean;distanceKm:number;notes:string;tripId:string|null};
export type WorkTripRow = {id:string;destination:string;startDate:string;endDate:string;status:string;details:Record<string,string|number>};
export type WorkExpenseRow = {id:string;tripId:string|null;date:string;category:string;amount:number;currency:string;exchangeRate:number;rateDate:string;rateSource:string;paymentSource:string;reimbursable:boolean;paid:boolean;notes:string;documentId:string|null};
export type WorkDocumentRow = {id:string;tripId:string|null;entryId:string|null;name:string;category:string;mimeType:string;size:number;createdAt:string;documentDate:string|null;payslipMonth:string|null};
export type WorkData = {employments?:{id:string;name:string;archivedAt:string|null}[];employmentId?:string|null;archived?:boolean;contractVersions?:{effectiveFrom:string;contract:WorkContract}[];contract:WorkContract;entries:WorkEntryRow[];trips:WorkTripRow[];expenses:WorkExpenseRow[];documents:WorkDocumentRow[];today:string;timezone:string};
export const workTypes:Record<string,string> = {WORK:'עבודה',HOME:'עבודה מהבית',TRAVEL:'נסיעה',SICK:'מחלה',VACATION:'חופשה',OTHER:'אחר'};
export const workClock=(minutes:number)=>`${Math.floor(Math.max(0,minutes)/60)}:${String(Math.floor(Math.max(0,minutes)%60)).padStart(2,'0')}`;
export function dayKey(date:Date,timezone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function parseBreakSegments(value:unknown):WorkBreakSegment[]{return Array.isArray(value)?value.filter((v):v is WorkBreakSegment=>Boolean(v&&typeof v==='object'&&typeof v.startedAt==='string'&&Number.isFinite(Date.parse(v.startedAt))&&(v.endedAt===null||typeof v.endedAt==='string'&&Number.isFinite(Date.parse(v.endedAt)))&&typeof v.paid==='boolean')):[];}
export function workDurations(entry:WorkEntryRow,now=Date.now()){
 if(!entry.startedAt)return {presence:0,net:0,paid:0,unpaid:0,breakTotal:0};
 const end=entry.endedAt?Date.parse(entry.endedAt):now,segments=parseBreakSegments(entry.breakSegments),seconds=(start:string,finish:string|null)=>Math.max(0,((finish?Date.parse(finish):end)-Date.parse(start))/1000);
 const closedUnpaid=segments.filter(s=>!s.paid&&s.endedAt).reduce((sum,s)=>sum+seconds(s.startedAt,s.endedAt),0),legacy=Math.max(0,entry.breakMinutes-Math.floor(closedUnpaid/60))*60;
 let unpaid=legacy,paid=0;for(const segment of segments){const duration=seconds(segment.startedAt,segment.endedAt);if(segment.paid)paid+=duration;else unpaid+=duration;}
 if(entry.pausedAt&&!segments.some(s=>s.endedAt===null))unpaid+=seconds(entry.pausedAt,null);
 const presence=Math.max(0,(end-Date.parse(entry.startedAt))/1000);return {presence:Math.floor(presence/60),net:Math.floor(Math.max(0,presence-unpaid)/60),paid:Math.floor(paid/60),unpaid:Math.floor(unpaid/60),breakTotal:Math.floor((paid+unpaid)/60)};
}
export function shiftMinutes(entry:WorkEntryRow,now=Date.now()){return workDurations(entry,now).net;}
// Sunday-first annual index: week 1 contains Jan 1 of each date's calendar year.
export function annualSundayWeek(date:string){const d=new Date(date+'T00:00:00Z'),start=new Date(Date.UTC(d.getUTCFullYear(),0,1));start.setUTCDate(start.getUTCDate()-start.getUTCDay());return {year:d.getUTCFullYear(),week:Math.floor((d.valueOf()-start.valueOf())/604800000)+1};}
export function monthlyWorkWeeks(month:string){const groups=new Map<string,{year:number;week:number;dates:string[]}>();for(const date of monthDays(month)){const {year,week}=annualSundayWeek(date),key=year+'-'+week;if(!groups.has(key))groups.set(key,{year,week,dates:[]});groups.get(key)!.dates.push(date);}return [...groups.values()];}
export function monthDays(month:string){const start=new Date(`${month}-01T00:00:00Z`),last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();return Array.from({length:last},(_,index)=>`${month}-${String(index+1).padStart(2,'0')}`);}
export function monthSummary(entries:WorkEntryRow[],month:string,contract:WorkContract,now=Date.now(),timezone='UTC'){
  const rows=entries.filter(entry=>entry.date.startsWith(month));
  const days=monthDays(month).map(date=>{
    const day=rows.filter(entry=>entry.date===date),shifts=day.filter(entry=>entry.startedAt).sort((a,b)=>Date.parse(a.startedAt!)-Date.parse(b.startedAt!));
    let minutes=0,approvedFirst=0,approvedNext=0;
    for(const shift of shifts){const next=minutes+shiftMinutes(shift,now),from=Math.max(0,minutes-contract.standardMinutes),to=Math.max(0,next-contract.standardMinutes);if(shift.overtimeApproved){approvedFirst+=Math.max(0,Math.min(to,contract.overtimeFirstMinutes)-Math.min(from,contract.overtimeFirstMinutes));approvedNext+=Math.max(0,to-contract.overtimeFirstMinutes)-Math.max(0,from-contract.overtimeFirstMinutes);}minutes=next;}
    return {date,minutes,regular:Math.min(minutes,contract.standardMinutes),overtime:Math.max(0,minutes-contract.standardMinutes),approvedFirst,approvedNext,sick:day.some(entry=>entry.type==='SICK'),vacation:day.some(entry=>entry.type==='VACATION'),travel:day.some(entry=>entry.type==='TRAVEL'),worked:minutes>0};
  });
  const today=dayKey(new Date(now),timezone),eligible=(date:string)=>inEmployment(date,contract);
  const allWorkDays=days.filter(d=>isWorkingDay(d.date,contract)),employmentDays=days.filter(d=>eligible(d.date));
  const expectedDays=allWorkDays.filter(d=>eligible(d.date));
  const periodFraction=!contract.employmentStartDate?0:contract.prorationMode==='calendarDays'?employmentDays.length/days.length:allWorkDays.length?expectedDays.length/allWorkDays.length:0;
  const salaryReady=Boolean(contract.employmentStartDate&&contract.baseSalary>0&&contract.monthlyHours>0&&periodFraction>0);
  const paidDays=days.filter(d=>eligible(d.date)),approvedFirst=paidDays.reduce((sum,d)=>sum+d.approvedFirst,0),approvedNext=paidDays.reduce((sum,d)=>sum+d.approvedNext,0);
  const minutes=days.reduce((sum,d)=>sum+d.minutes,0),workedDays=days.filter(d=>d.worked).length,hourly=contract.monthlyHours?contract.baseSalary/contract.monthlyHours:0;
  const overtimePay=salaryReady?hourly/60*(approvedFirst*contract.overtimeFirstPercent/100+approvedNext*contract.overtimeNextPercent/100):0;
  const basePay=salaryReady?contract.baseSalary*periodFraction:0,travelPay=salaryReady?contract.travelAllowance*(contract.prorateTravel?periodFraction:1):0;
  const socialBase=basePay*contract.contributionBasePercent/100,sickDays=days.filter(d=>d.sick).length;
  const sickAdjustment=salaryReady?paidDays.filter(d=>d.sick).length*contract.standardMinutes/60*hourly*(contract.sickPayPercent/100-1):0;
  const completed=expectedDays.filter(d=>d.date<today),hasRecords=rows.length>0;
  const reported=(date:string)=>rows.some(r=>r.date===date&&r.endedAt)||rows.some(r=>r.date===date&&['SICK','VACATION'].includes(r.type));
  const deficitMinutes=completed.filter(d=>reported(d.date)&&!d.sick&&!d.vacation).reduce((sum,d)=>sum+Math.max(0,contract.standardMinutes-d.minutes),0);
  const unreportedDays=completed.filter(d=>!reported(d.date)).length;
  return {days,minutes,workedDays,approvedMinutes:days.reduce((sum,d)=>sum+d.approvedFirst+d.approvedNext,0),overtimePay,meals:paidDays.filter(d=>d.worked).length*contract.mealPerDay,sickAdjustment,gross:Math.max(0,basePay+overtimePay+travelPay+sickAdjustment),socialBase,sickDays,vacationDays:days.filter(d=>d.vacation).length,basePay,travelPay,periodFraction,salaryReady,hasRecords,deficitMinutes,unreportedDays};
}
export function inEmployment(date:string,contract:WorkContract){return Boolean(contract.employmentStartDate&&date>=contract.employmentStartDate&&(!contract.employmentEndDate||date<=contract.employmentEndDate));}
export function isWorkingDay(date:string,contract:WorkContract){return contract.workDays.includes(new Date(`${date}T00:00:00Z`).getUTCDay());}
export function vacationBalance(entries:WorkEntryRow[],year:string,contract:WorkContract,today:string,versions:WorkData['contractVersions']=[]){
  const cutoff=today<`${year}-12-31`?today:`${year}-12-31`;
  const ordered=[...versions].sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom));
  const effective=(date:string)=>ordered.find(v=>v.effectiveFrom<=date)?.contract??contract;
  const allDays=Array.from({length:12},(_,i)=>monthDays(`${year}-${String(i+1).padStart(2,'0')}`)).flat();
  let accrued=0;
  if(cutoff>=`${year}-01-01`)for(let m=1;m<=12;m++){
    const dates=monthDays(`${year}-${String(m).padStart(2,'0')}`);
    for(const date of dates){
      // Future contract revisions never rewrite entitlement earned in earlier months.
      const terms=effective(date>cutoff?cutoff:date);
      if(!inEmployment(date,terms)||!terms.employmentStartDate||terms.employmentStartDate>cutoff)continue;
      if(terms.vacationAccrual==='annual')accrued+=terms.vacationDays/allDays.length;
      else if(date<=cutoff)accrued+=terms.vacationDays/12/dates.length;
    }
  }
  const used=new Set(entries.filter(e=>e.type==='VACATION'&&e.date.startsWith(year)&&inEmployment(e.date,effective(e.date))).map(e=>e.date)).size;
  return {accrued:Number(accrued.toFixed(2)),used,remaining:Number((accrued+effective(cutoff).vacationCarryover-used).toFixed(2))};
}
export function tripSummary(trip:WorkTripRow,expenses:WorkExpenseRow[]){
  const days=Math.max(1,Math.round((Date.parse(trip.endDate)-Date.parse(trip.startDate))/86400000)+1);
  const departure=Number(trip.details.departureFactor??1),returnDay=Number(trip.details.returnFactor??1);
  const eligibleDays=days===1?Math.min(departure,returnDay):Math.max(0,days-2)+departure+returnDay;
  const perDiem=Number(trip.details.perDiem||0)*eligibleDays,rows=expenses.filter(e=>e.tripId===trip.id);
  const personal=rows.filter(e=>e.paymentSource==='PERSONAL'&&e.reimbursable).reduce((s,e)=>s+e.amount*e.exchangeRate,0);
  const company=rows.filter(e=>e.paymentSource==='COMPANY').reduce((s,e)=>s+e.amount*e.exchangeRate,0);
  const expenseTotal=rows.reduce((s,e)=>s+e.amount*e.exchangeRate,0),perDiemILS=perDiem*Number(trip.details.perDiemExchangeRate??(trip.details.perDiemCurrency==='ILS'?1:0));
  const personalPaid=rows.filter(e=>e.paymentSource==='PERSONAL').reduce((s,e)=>s+e.amount*e.exchangeRate,0),reimbursed=rows.filter(e=>e.paymentSource==='PERSONAL'&&e.reimbursable&&e.paid).reduce((s,e)=>s+e.amount*e.exchangeRate,0),outstanding=rows.filter(e=>e.paymentSource==='PERSONAL'&&e.reimbursable&&!e.paid).reduce((s,e)=>s+e.amount*e.exchangeRate,0);
  return {days,eligibleDays,perDiem,personal,personalPaid,reimbursed,outstanding,company,expenseTotal,total:expenseTotal+perDiemILS,perDiemConverted:Boolean(trip.details.perDiemExchangeRate||trip.details.perDiemCurrency==='ILS')};
}
// Interpret wall-clock fields in the user's timezone; reject nonexistent DST times.
export function localInstant(date:string,time:string,timezone:string){
  const target=Date.parse(`${date}T${time}:00Z`);let value=target;
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(let i=0;i<4;i++){const p=Object.fromEntries(formatter.formatToParts(new Date(value)).map(part=>[part.type,part.value]));const rendered=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);const delta=target-rendered;if(delta===0)return new Date(value);value+=delta;}
  throw new Error('השעה אינה קיימת באזור הזמן שנבחר.');
}

export function contractForMonth(data:WorkData,month:string){return [...(data.contractVersions??[])].filter(v=>v.effectiveFrom<=`${month}-01`).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.contract??data.contract;}
