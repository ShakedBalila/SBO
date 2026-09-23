import Link from "next/link";
import { ArrowUpRight, ArrowRight, CheckCheck, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { moduleData } from "@/lib/module-data";
import { LiveModuleCards } from "@/components/live-module-cards";
import { calendarOccurrence } from "@/lib/calendar-occurrence";

export default async function Dashboard(){
  const user=await requireUser();
  const timezone=user.settings?.timezone??"Asia/Jerusalem";
  const [summary,tasks,events]=await Promise.all([
    moduleData(user.id,timezone),
    db.task.findMany({where:{userId:user.id,deletedAt:null},select:{id:true,title:true,status:true,priority:true,startDate:true,endDate:true,recurrence:true,recurrenceDays:true,recurrenceUntil:true,startTime:true}}),
    db.calendarEvent.findMany({where:{userId:user.id},select:{id:true,title:true,date:true,endDate:true,recurrence:true,recurrenceDays:true,recurrenceUntil:true,time:true},take:500})
  ]);
  const open=tasks.filter(task=>task.status!=="DONE"&&task.status!=="CANCELLED");
  const done=tasks.filter(task=>task.status==="DONE").length;
  const due=open.filter(task=>task.startDate?.toISOString().slice(0,10)===summary.today).length;
  const overdue=open.filter(task=>task.endDate&&task.endDate.toISOString().slice(0,10)<summary.today).length;
  const important=open.filter(task=>task.priority==="HIGH").length;
  const percent=tasks.length?Math.round(done/tasks.length*100):0;
  const todayItems=[
    ...open.filter(task=>calendarOccurrence({startDate:task.startDate?.toISOString().slice(0,10),endDate:task.endDate?.toISOString().slice(0,10),recurrence:task.recurrence,recurrenceDays:task.recurrenceDays,recurrenceUntil:task.recurrenceUntil?.toISOString().slice(0,10)},summary.today).occurs).map(task=>({id:task.id,title:task.title,time:task.startTime,kind:'משימה'})),
    ...events.filter(event=>calendarOccurrence({date:event.date.toISOString().slice(0,10),endDate:event.endDate?.toISOString().slice(0,10),recurrence:event.recurrence,recurrenceDays:event.recurrenceDays,recurrenceUntil:event.recurrenceUntil?.toISOString().slice(0,10)},summary.today).occurs).map(event=>({id:event.id,title:event.title,time:event.time,kind:'אירוע'}))
  ].sort((a,b)=>(a.time??'99:99').localeCompare(b.time??'99:99'));
  const now=new Date();
  const civilDate=new Intl.DateTimeFormat("he-IL",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:timezone}).format(now);
  const hebrewDate=new Intl.DateTimeFormat("he-IL-u-ca-hebrew",{day:"numeric",month:"long",timeZone:timezone}).format(now);
  return <div className="dashboard-home">
    <section className="dashboard-date" aria-label="התאריך היום"><CalendarDays/><div><strong>{civilDate}</strong><span>{hebrewDate}</span></div></section>
    <header className="page-heading dashboard-heading"><h1>שלום, {user.name.split(" ")[0]}</h1></header>
    <div className="section-heading dashboard-section-heading"><h2>התחומים שלך <span className="count-badge">4</span></h2></div>
    <section className="module-grid" aria-label="התחומים שלך">
      <Link href="/tasks" className="module-card tasks-card"><div className="card-top"><span className="module-icon"><CheckCheck/></span><span className="card-label">ניהול זמן ומשימות<small>משימות, אירועים ולוח שנה</small></span><ArrowUpRight className="card-arrow" size={20}/></div><div className="task-card-body"><div><div className="big-number">{open.length}<span>משימות פתוחות</span></div><p>{due} משימות מתוכננות להיום</p></div><div className="progress-ring" style={{"--progress":`${percent}%`} as React.CSSProperties}><div><strong>{percent}%</strong><span>הושלמו</span></div></div></div><div className="home-day-agenda"><strong><CalendarDays size={15}/>היום בלוח השנה</strong><div>{todayItems.length?todayItems.slice(0,3).map(item=><span key={`${item.kind}-${item.id}`}><i>{item.time??'כל היום'}</i><b>{item.title}</b><small>{item.kind}</small></span>):<span className="home-day-empty" aria-label="אין משימות או אירועים היום"/>}</div>{todayItems.length>3&&<small>ועוד {todayItems.length-3}</small>}</div><div className="card-metrics"><span><b>{due}</b>להיום</span><span><b>{overdue}</b>באיחור</span><span><b>{important}</b>חשיבות גבוהה</span></div><div className="card-footer">פתיחת ניהול הזמן<ArrowRight size={16}/></div></Link>
      <LiveModuleCards summary={summary}/>
    </section>
  </div>;
}
