import {monthSummary,workClock,workTypes,type WorkData} from './work-calculations';
export function reportRows(data:WorkData,month:string){
  const clock=(value:string|null)=>value?new Intl.DateTimeFormat('he-IL',{timeZone:data.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)):'—';
  const summary=monthSummary(data.entries,month,data.contract);
  return summary.days.filter(day=>day.minutes||day.sick||day.vacation||data.entries.some(e=>e.date===day.date)).map(day=>{const entries=data.entries.filter(entry=>entry.date===day.date),shifts=entries.filter(e=>e.startedAt).sort((a,b)=>Date.parse(a.startedAt!)-Date.parse(b.startedAt!));return[day.date,shifts.length?clock(shifts[0].startedAt):'—',workClock(entries.reduce((sum,e)=>sum+e.breakMinutes,0)),shifts.length?clock(shifts.at(-1)!.endedAt):'—',workClock(day.minutes),[...new Set(entries.map(e=>workTypes[e.type]))].join(', '),workClock(day.regular),workClock(day.approvedFirst+day.approvedNext)];});
}
