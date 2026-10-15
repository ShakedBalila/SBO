import {WorkoutOverviewCard} from '@/components/workout-overview-card';
import {workData} from '@/lib/work-data';
import {monthSummary,shiftMinutes,workClock,vacationBalance} from '@/lib/work-calculations';
import {OnboardingPrompt} from '@/components/onboarding';
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
 const [work,summary,tasks,events]=await Promise.all([workData(user.id,timezone),moduleData(user.id,timezone),db.task.findMany({where:{userId:user.id,deletedAt:null}}),db.calendarEvent.findMany({where:{userId:user.id},orderBy:{date:'asc'},take:500})]);
 const today=summary.today,workSummary=monthSummary(work.entries,today.slice(0,7),work.contract,Date.now(),timezone),workToday=work.entries.filter(e=>e.date===today).reduce((sum,e)=>sum+shiftMinutes(e),0),vacation=vacationBalance(work.entries,today.slice(0,4),work.contract,today),upcoming=work.trips.filter(t=>t.endDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0];
 const todaysTasks=tasks.filter(task=>task.status!=='DONE'&&task.status!=='CANCELLED'&&calendarOccurrence({...task,startDate:task.startDate?.toISOString().slice(0,10),endDate:task.endDate?.toISOString().slice(0,10),recurrenceUntil:task.recurrenceUntil?.toISOString().slice(0,10)},today).occurs);
 const todaysEvents=events.filter(event=>calendarOccurrence({...event,date:event.date.toISOString().slice(0,10),endDate:event.endDate?.toISOString().slice(0,10),recurrenceUntil:event.recurrenceUntil?.toISOString().slice(0,10)},today).occurs);
 const hiddenLinks=await db.workoutLink.findMany({where:{userId:user.id,hidden:true},select:{sourceKind:true,sourceId:true}});
 const open=todaysTasks.filter(t=>!hiddenLinks.some(l=>l.sourceKind==='task'&&l.sourceId===t.id)).length,eventCount=todaysEvents.filter(e=>!hiddenLinks.some(l=>l.sourceKind==='event'&&l.sourceId===e.id)).length;
 const date=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:timezone}).format(new Date());
 return <div className="dashboard-home dashboard-redesign">
  <header className="dashboard-masthead"><div><span className="dashboard-wordmark" dir="ltr">SBO</span><h1>שלום, {user.name.split(' ')[0]}</h1><p>{date}</p></div><DashboardActions name={user.name}/></header>
  <OnboardingPrompt status={user.settings?.onboardingStatus??'complete'}/>
  <section className="dashboard-stack" aria-label="התחומים שלך">
   <Link href="/tasks" className="overview-card overview-tasks"><DashboardArt kind="tasks"/><div className="overview-content"><h2><span className="overview-tasks-title-long">ניהול זמן ומשימות</span><span className="overview-tasks-title-short">משימות</span></h2><div className="today-counts"><span><strong>{open}</strong><small>משימות להיום</small></span><span><strong>{eventCount}</strong><small>אירועים להיום</small></span></div></div></Link>
   <Link href="/work" className="overview-card overview-work"><DashboardArt kind="work"/><div className="overview-content"><h2>עבודה</h2><div className="work-overview-values"><strong dir="ltr">{workClock(workToday)} <small>/ {workClock(work.contract.standardMinutes)}</small></strong><span>היום</span><p>החודש <b dir="ltr">{workClock(workSummary.minutes)}</b><span className="overview-overtime"> · נוספות <b dir="ltr">{workClock(workSummary.approvedMinutes)}</b></span></p>{work.contract.employmentStartDate?<small>חופשה שנותרה: {vacation.remaining} ימים</small>:<small>הגדרת תנאי עבודה</small>}{upcoming&&<small className="upcoming-work-trip">נסיעה: {upcoming.destination}</small>}</div></div></Link>
   <LiveModuleCards summary={summary}/>
   <WorkoutOverviewCard userId={user.id} today={today}/>
  </section>
 </div>;
}
