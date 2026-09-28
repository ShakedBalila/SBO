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
 const open=todaysTasks.length,eventCount=todaysEvents.length;
 const date=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:timezone}).format(new Date());
 return <div className="dashboard-home dashboard-redesign">
  <header className="dashboard-masthead"><div><span className="dashboard-wordmark" dir="ltr">SBO</span><h1>שלום, {user.name.split(' ')[0]}</h1><p>{date}</p></div><DashboardActions name={user.name}/></header>
  <section className="dashboard-stack" aria-label="התחומים שלך">
   <Link href="/tasks" className="overview-card overview-tasks"><DashboardArt kind="tasks"/><div className="overview-content"><h2>ניהול זמן ומשימות<ChevronLeft aria-hidden="true"/></h2><div className="today-counts"><span><strong>{open}</strong><small>משימות להיום</small></span><span><strong>{eventCount}</strong><small>אירועים להיום</small></span></div></div></Link>
   <LiveModuleCards summary={summary}/>
  </section>
 </div>;
}
