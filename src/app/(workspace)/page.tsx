import Link from "next/link";
import { ArrowUpRight, ArrowRight, CheckCheck, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { moduleData } from "@/lib/module-data";
import { LiveModuleCards } from "@/components/live-module-cards";

export default async function Dashboard(){
  const user=await requireUser();
  const timezone=user.settings?.timezone??"Asia/Jerusalem";
  const [summary,tasks]=await Promise.all([
    moduleData(user.id,timezone),
    db.task.findMany({where:{userId:user.id,deletedAt:null},select:{status:true,priority:true,startDate:true,endDate:true}})
  ]);
  const open=tasks.filter(task=>task.status!=="DONE"&&task.status!=="CANCELLED");
  const done=tasks.length-open.length;
  const due=open.filter(task=>task.startDate?.toISOString().slice(0,10)===summary.today).length;
  const overdue=open.filter(task=>task.endDate&&task.endDate.toISOString().slice(0,10)<summary.today).length;
  const important=open.filter(task=>task.priority==="HIGH"||task.priority==="URGENT").length;
  const percent=tasks.length?Math.round(done/tasks.length*100):0;
  const now=new Date();
  const civilDate=new Intl.DateTimeFormat("he-IL",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:timezone}).format(now);
  const hebrewDate=new Intl.DateTimeFormat("he-IL-u-ca-hebrew",{day:"numeric",month:"long",timeZone:timezone}).format(now);
  return <div className="dashboard-home">
    <section className="dashboard-date" aria-label="התאריך היום"><CalendarDays/><div><strong>{civilDate}</strong><span>{hebrewDate}</span></div></section>
    <header className="page-heading dashboard-heading"><h1>שלום, {user.name.split(" ")[0]}</h1></header>
    <div className="section-heading dashboard-section-heading"><h2>התחומים שלך <span className="count-badge">4</span></h2></div>
    <section className="module-grid" aria-label="התחומים שלך">
      <Link href="/tasks" className="module-card tasks-card"><div className="card-top"><span className="module-icon"><CheckCheck/></span><span className="card-label">ניהול זמן ומשימות<small>משימות, אירועים ולוח שנה</small></span><ArrowUpRight className="card-arrow" size={20}/></div><div className="task-card-body"><div><div className="big-number">{open.length}<span>משימות פתוחות</span></div><p>{due} משימות מתוכננות להיום</p></div><div className="progress-ring" style={{"--progress":`${percent}%`} as React.CSSProperties}><div><strong>{percent}%</strong><span>הושלמו</span></div></div></div><div className="card-metrics"><span><b>{due}</b>להיום</span><span><b>{overdue}</b>באיחור</span><span><b>{important}</b>חשיבות גבוהה</span></div><div className="card-footer">פתיחת ניהול הזמן<ArrowRight size={16}/></div></Link>
      <LiveModuleCards summary={summary}/>
    </section>
  </div>;
}
