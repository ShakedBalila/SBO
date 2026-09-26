import {TransitionLink as Link} from '@/components/transition-link';
import {ChevronLeft} from 'lucide-react';
import {requireUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {moduleData} from '@/lib/module-data';
import {LiveModuleCards} from '@/components/live-module-cards';
import {DashboardArt} from '@/components/dashboard-art';
import {DashboardActions} from '@/components/dashboard-actions';
export default async function Dashboard(){
 const user=await requireUser(),timezone=user.settings?.timezone??'Asia/Jerusalem';
 const [summary,tasks]=await Promise.all([moduleData(user.id,timezone),db.task.findMany({where:{userId:user.id,deletedAt:null},select:{status:true}})]);
 const open=tasks.filter(t=>t.status!=='DONE'&&t.status!=='CANCELLED').length;
 const done=tasks.filter(t=>t.status==='DONE').length,percent=tasks.length?Math.round(done/tasks.length*100):0;
 const date=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:timezone}).format(new Date());
 return <div className="dashboard-home dashboard-redesign">
  <header className="dashboard-masthead"><div><span className="dashboard-wordmark" dir="ltr">SBO</span><h1>שלום, {user.name.split(' ')[0]}</h1><p>{date}</p></div><DashboardActions name={user.name}/></header>
  <section className="dashboard-stack" aria-label="התחומים שלך">
   <Link href="/tasks" className="overview-card overview-tasks"><DashboardArt kind="tasks"/><div className="overview-content"><h2>ניהול זמן ומשימות<ChevronLeft aria-hidden="true"/></h2><p>{open} משימות פתוחות</p><div className="dashboard-ring task-overview-ring" style={{'--fill':`${percent}%`} as React.CSSProperties}><strong>{open}</strong><span>פתוחות</span></div></div></Link>
   <LiveModuleCards summary={summary}/>
  </section>
 </div>;
}
