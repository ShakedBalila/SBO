import Link from "next/link";
import { ArrowUpRight, ArrowRight, CheckCheck, CalendarDays, Circle, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayIn } from "@/lib/tasks";
import { copy } from "@/lib/copy";
import { moduleData } from '@/lib/module-data';
import { LiveModuleCards } from '@/components/live-module-cards';
export default async function Dashboard() {
  const user = await requireUser();
  const summary = await moduleData(user.id, user.settings?.timezone ?? 'Asia/Jerusalem');
  const today = todayIn(user.settings?.timezone ?? "Asia/Jerusalem");
  const tasks = await db.task.findMany({ where: { userId: user.id }, orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }] });
  const open = tasks.filter(t => t.status !== "DONE"&&t.status!=="CANCELLED");
  const done = tasks.length - open.length;
  const due = open.filter(t => t.startDate?.toISOString().slice(0, 10) === today).length;
  const overdue = open.filter(t => t.endDate && t.endDate.toISOString().slice(0, 10) < today).length;
  const urgent = open.filter(t => t.priority === "URGENT").length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  return <>
    <div className="topline"><span>סביבת עבודה <span className="crumb">/</span> <strong>סקירה</strong></span><span className="date-label"><CalendarDays size={15}/>{new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeZone: user.settings?.timezone ?? "Asia/Jerusalem" }).format(new Date())}</span></div>
    <header className="page-heading"><div><span className="eyebrow">היום שלך במבט אחד</span><h1>שלום, {user.name.split(" ")[0]}</h1><p>כל מה שחשוב לך, במקום אחד וברור.</p></div></header>
    <div className="section-heading"><h2>התחומים שלך <span className="count-badge">4</span></h2><span>מרחב אחד לניהול היום־יום</span></div>
    <section className="module-grid" aria-label="התחומים שלך">
      <Link href="/tasks" className="module-card tasks-card"><div className="card-top"><span className="module-icon"><CheckCheck/></span><span className="card-label">ניהול זמן ומשימות<small>משימות, אירועים ולוח שנה</small></span><ArrowUpRight className="card-arrow" size={20}/></div><div className="task-card-body"><div><div className="big-number">{open.length}<span>משימות פתוחות</span></div><p>{due ? `${due} משימות מתוכננות להיום` : "אפשר לתכנן את הצעד הבא"}</p></div><div className="progress-ring" style={{ "--progress": `${percent}%` } as React.CSSProperties}><div><strong>{percent}%</strong><span>הושלמו</span></div></div></div><div className="card-metrics"><span><b>{due}</b>להיום</span><span><b>{overdue}</b>באיחור</span><span><b>{urgent}</b>דחופות</span></div><div className="card-footer">פתיחת ניהול הזמן<ArrowRight size={16}/></div></Link>
      <LiveModuleCards summary={summary}/>
    </section>
    <section className="focus-panel"><div className="section-heading"><div><h2>המשימות הבאות</h2><p>כמה צעדים שיקדמו את היום שלך.</p></div><Link className="text-link" href="/tasks">כל המשימות<ArrowRight size={16}/></Link></div>{open.length ? <div className="up-next">{open.slice(0, 3).map(task => <Link key={task.id} href="/tasks" className="preview-task"><Circle size={20}/><strong>{task.title}</strong><span className={`badge priority-${task.priority.toLowerCase()}`}>{copy.priority[task.priority]}</span></Link>)}</div> : <div className="dashboard-empty"><span className="empty-icon"><Sparkles size={24}/></span><div><h3>הכול נקי.</h3><p>אפשר להוסיף משימות מתוך מסך המשימות.</p></div></div>}</section>
    <footer className="workspace-footer"><span>SBO · קצת יותר מסודר.</span><span>סביבת העבודה האישית שלך</span></footer>
  </>;
}
