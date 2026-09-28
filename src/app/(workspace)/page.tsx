import {TransitionLink as Link} from '@/components/transition-link';
import {ChevronLeft} from 'lucide-react';
import {requireUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {moduleData} from '@/lib/module-data';
import {LiveModuleCards} from '@/components/live-module-cards';
import {DashboardArt} from '@/components/dashboard-art';
import {DashboardActions} from '@/components/dashboard-actions';
import {calendarOccurrence} from '@/lib/calendar-occurrence';
export default async function Dashboard(){
 const user=await requireUser(),timezone=user.settings?.timezone??'Asia/Jerusalem';
 const [summary,tasks,events]=await Promise.all([moduleData(user.id,timezone),db.task.findMany({where:{userId:user.id,deletedAt:null}}),db.calendarEvent.findMany({where:{userId:user.id},orderBy:{date:'asc'},take:500})]);
 const today=summary.today;
 const todaysTasks=tasks.filter(task=>task.status!=='DONE'&&task.status!=='CANCELLED'&&calendarOccurrence({...task,startDate:task.startDate?.toISOString().slice(0,10),endDate:task.endDate?.toISOString().slice(0,10),recurrenceUntil:task.recurrenceUntil?.toISOString().slice(0,10)},today).occurs);
 const todaysEvents=events.filter(event=>calendarOccurrence({...event,date:event.date.toISOString().slice(0,10),endDate:event.endDate?.toISOString().slice(0,10),recurrenceUntil:event.recurrenceUntil?.toISOString().slice(0,10)},today).occurs);
 const open=todaysTasks.length;
 const done=tasks.filter(t=>t.status==='DONE').length,percent=tasks.length?Math.round(done/tasks.length*100):0;
 const agenda=[...todaysTasks.map(item=>({id:`task-${item.id}`,title:item.title,time:item.startTime,kind:'משימה'})),...todaysEvents.map(item=>({id:`event-${item.id}`,title:item.title,time:item.time,kind:'אירוע'}))].sort((a,b)=>(a.time??'99:99').localeCompare(b.time??'99:99'));
 const date=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:timezone}).format(new Date());
 return <div className="dashboard-home dashboard-redesign">
  <header className="dashboard-masthead"><div><span className="dashboard-wordmark" dir="ltr">SBO</span><h1>שלום, {user.name.split(' ')[0]}</h1><p>{date}</p></div><DashboardActions name={user.name}/></header>
  <section className="dashboard-stack" aria-label="התחומים שלך">
   <Link href="/tasks" className="overview-card overview-tasks"><DashboardArt kind="tasks"/><div className="overview-content"><h2>ניהול זמן ומשימות<ChevronLeft aria-hidden="true"/></h2><p>{open} משימות פתוחות</p><div className="dashboard-ring task-overview-ring" style={{'--fill':`${percent}%`} as React.CSSProperties}><strong>{open}</strong><span>פתוחות</span></div></div></Link>
   <LiveModuleCards summary={summary}/>
  </section>
  <section className="dashboard-agenda"><div className="section-heading"><div><h2>פעילויות קרובות</h2><p>משימות ואירועים להיום לפי סדר השעה</p></div><Link href="/tasks">לכל המשימות <ChevronLeft size={16}/></Link></div>{agenda.length?<div className="agenda-list">{agenda.map(item=><article key={item.id}><time>{item.time??'כל היום'}</time><i/><div><strong>{item.title}</strong><small>{item.kind}</small></div></article>)}</div>:<p className="journal-empty">אין פעילויות מתוכננות להיום.</p>}</section>
 </div>;
}
