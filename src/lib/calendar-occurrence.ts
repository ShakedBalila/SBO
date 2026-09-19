function dayDelta(a:string,b:string){return Math.max(0,Math.round((new Date(`${b}T00:00:00Z`).getTime()-new Date(`${a}T00:00:00Z`).getTime())/86400000));}
function shift(value:string,days:number){const d=new Date(`${value}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function anchorOccurs(item:Record<string,unknown>,date:string){const start=String(item.startDate??item.date??'');if(!start||date<start||(item.recurrenceUntil&&date>String(item.recurrenceUntil)))return false;const recurrence=String(item.recurrence??'NONE'),current=new Date(`${date}T00:00:00Z`),base=new Date(`${start}T00:00:00Z`);if(recurrence==='NONE')return date===start;if(recurrence==='DAILY')return true;if(recurrence==='WEEKLY')return current.getUTCDay()===base.getUTCDay();if(recurrence==='MONTHLY')return current.getUTCDate()===base.getUTCDate();if(recurrence==='YEARLY')return current.getUTCMonth()===base.getUTCMonth()&&current.getUTCDate()===base.getUTCDate();return Array.isArray(item.recurrenceDays)&&(item.recurrenceDays as number[]).includes(current.getUTCDay());}
export function calendarOccurrence(item:Record<string,unknown>,date:string){const start=String(item.startDate??item.date??''),end=String(item.endDate??start),duration=start?dayDelta(start,end):0;for(let offset=0;offset<=duration;offset++)if(anchorOccurs(item,shift(date,-offset)))return {occurs:true,start:offset===0,end:offset===duration};return {occurs:false,start:false,end:false};}

export type CalendarSegment<T>={item:T;start:number;end:number;lane:number};
export function weekEventSegments<T extends Record<string,unknown>>(events:T[],week:string[]):CalendarSegment<T>[] {
 const result:CalendarSegment<T>[]=[];
 for(const item of events){
  if(!item.endDate||String(item.endDate)<=String(item.date))continue;
  let start=-1;
  for(let i=0;i<=week.length;i++){
   const occurs=i<week.length&&calendarOccurrence(item,week[i]).occurs;
   if(occurs&&start<0)start=i;
   if(!occurs&&start>=0){let lane=0;while(result.some(segment=>segment.lane===lane&&segment.start<=i-1&&segment.end>=start))lane++;result.push({item,start,end:i-1,lane});start=-1;}
  }
 }
 return result;
}
