"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Check, Pencil, Trash2, X, CheckCheck, CalendarDays, Circle, LoaderCircle } from "lucide-react";
import { TaskDTO, TaskInput, taskStatuses, taskPriorities, recurrences } from "@/lib/tasks";
import { copy } from "@/lib/copy";
import { MonthCalendar, isoWeek } from '@/components/month-calendar';
import type { ModuleRecord } from '@/lib/modules';
const blank: TaskInput = { title: "", description: "", status: "TODO", priority: "MEDIUM", dueDate: null, recurrence: 'NONE', recurrenceUntil: null };
type Filter = "All" | "Today" | "Week" | "Upcoming" | "Overdue" | "Completed";
const filterLabels: Record<Filter, string> = { All: 'הכול', Today: 'היום', Week: 'שבוע', Upcoming: 'בהמשך', Overdue: 'באיחור', Completed: 'הושלמו' };
export function TasksWorkspace({ initialTasks, events, today, initiallyOpen }: { initialTasks: TaskDTO[]; events: ModuleRecord[]; today: string; initiallyOpen: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [week, setWeek] = useState(isoWeek(today));
  const [editing, setEditing] = useState<TaskDTO | null>(null);
  const [form, setForm] = useState<TaskInput>(blank);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<TaskDTO | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (initiallyOpen) {
      dialog.current?.showModal();
      router.replace('/tasks', { scroll: false });
    }
  }, [initiallyOpen, router]);
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
  const visible = initialTasks.filter(t => {
    const isOpen = t.status !== "DONE";
    return (priority === "ALL" || t.priority === priority) && `${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" || filter === "Completed" && !isOpen || filter === "Today" && isOpen && t.dueDate === today || filter === 'Week' && isOpen && !!t.dueDate && isoWeek(t.dueDate) === week || filter === "Upcoming" && isOpen && !!t.dueDate && t.dueDate > today || filter === "Overdue" && isOpen && !!t.dueDate && t.dueDate < today);
  });
  async function mutate(url: string, method: string, data?: TaskInput) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: data ? JSON.stringify(data) : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh(); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "לא ניתן להתחבר. השינויים לא נשמרו."); return false; }
    finally { setBusy(false); }
  }
  function openEditor(task: TaskDTO | null = null) {
    setEditing(task); setError("");
    setForm(task ? { title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.dueDate, recurrence: task.recurrence, recurrenceUntil: null } : { ...blank });
    dialog.current?.showModal();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await mutate(editing ? `/api/tasks/${editing.id}` : "/api/tasks", editing ? "PATCH" : "POST", form)) {
      dialog.current?.close(); setNotice(editing ? "המשימה עודכנה." : "המשימה נוספה.");
    }
  }
  async function complete(task: TaskDTO) {
    const { title, description, priority, dueDate, recurrence } = task;
    if (await mutate(`/api/tasks/${task.id}`, "PATCH", { title, description, priority, dueDate, recurrence, recurrenceUntil: null, status: task.status === "DONE" ? "TODO" : "DONE" })) setNotice(task.status === "DONE" ? "המשימה נפתחה מחדש." : "המשימה הושלמה!");
  }
  return <>
    <div className="topline"><span>סביבת עבודה <span className="crumb">/</span><strong>משימות</strong></span><span className="subtle">קצת התקדמות בכל יום</span></div>
    <header className="page-heading"><div><span className="eyebrow">גורמים לדברים לקרות</span><h1>המשימות שלך<span className="hello-dot">.</span></h1><p>מוציאים מהראש ומכניסים לרשימה.</p></div><button className="button primary" disabled={!ready} onClick={() => openEditor()}><Plus size={18}/>משימה חדשה</button></header>
    <div className="task-stats"><div><span className="stat-icon"><CheckCheck size={21}/></span><div><strong>{initialTasks.filter(t => t.status !== "DONE").length}</strong><span>משימות פתוחות</span></div></div><div><span className="stat-icon"><CalendarDays size={21}/></span><div><strong>{initialTasks.filter(t => t.dueDate === today && t.status !== "DONE").length}</strong><span>להיום</span></div></div><div><span className="stat-icon"><Check size={21}/></span><div><strong>{initialTasks.filter(t => t.status === "DONE").length}</strong><span>הושלמו</span></div></div></div>
    <section className="task-panel" id="task-list"><div className="task-tabs" aria-label="סינון משימות">{(["All", "Today", "Week", "Upcoming", "Overdue", "Completed"] as Filter[]).map(f => <button key={f} aria-pressed={filter === f} className={filter === f ? "selected" : ""} onClick={() => setFilter(f)}>{f === 'Week' ? `שבוע ${week}` : filterLabels[f]}</button>)}</div><div className="task-toolbar"><label className="search-field"><Search size={18}/><input aria-label="חיפוש משימות" placeholder="חיפוש במשימות…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="סינון לפי עדיפות" value={priority} onChange={e => setPriority(e.target.value)}><option value="ALL">כל העדיפויות</option>{taskPriorities.map(p => <option key={p} value={p}>{copy.priority[p]}</option>)}</select></div>
    <div className="feedback" aria-live="polite">{notice}</div>{error && !dialog.current?.open && !deleteDialog.current?.open && <p role="alert" className="error-text panel-error">{error}</p>}
    {visible.length ? <div className="task-list">{visible.map(task => <article className={`task-row ${task.status === "DONE" ? "is-done" : ""}`} key={task.id}><button className={`task-check ${task.status === "DONE" ? "checked" : ""}`} disabled={busy || !ready} onClick={() => complete(task)} aria-label={`${task.status === "DONE" ? "פתיחת" : "השלמת"} ${task.title}`}>{task.status === "DONE" && <Check size={15}/>}</button><div className="task-content"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="task-meta"><span>{copy.status[task.status]}</span>{task.dueDate && <span className={task.dueDate < today && task.status !== "DONE" ? "overdue" : ""}><CalendarDays size={13}/>{task.dueDate === today ? "היום" : new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(task.dueDate))}{task.dueDate < today && task.status !== "DONE" ? " · באיחור" : ""}</span>}</div></div><span className={`badge priority-${task.priority.toLowerCase()}`}>{copy.priority[task.priority]}</span><div className="row-actions"><button className="icon-button" onClick={() => openEditor(task)} disabled={busy || !ready} aria-label={`עריכת ${task.title}`}><Pencil size={16}/></button><button className="icon-button" onClick={() => { setRemoving(task); setError(""); deleteDialog.current?.showModal(); }} disabled={busy || !ready} aria-label={`מחיקת ${task.title}`}><Trash2 size={16}/></button></div></article>)}</div> : <div className="tasks-empty"><span className="empty-icon"><CheckCheck size={30}/></span><h2>{initialTasks.length ? "אין משימות ברשימה הזאת." : "תוכניות גדולות מתחילות בקטן."}</h2><p>{initialTasks.length ? "נסה סינון או חיפוש אחר." : "הוסף משימה ופנה מקום לצעד הבא."}</p>{!initialTasks.length && <button className="button primary" disabled={!ready} onClick={() => openEditor()}><Plus size={18}/>הוספת המשימה הראשונה</button>}</div>}
    <div className="task-panel-footer">{visible.length} משימות<span>צעד אחד בכל פעם.</span></div></section>
    <MonthCalendar tasks={initialTasks} events={events} today={today} onWeek={selected => { setWeek(selected); setFilter('Week'); document.getElementById('task-list')?.scrollIntoView({ behavior:'smooth' }); }}/>
    <dialog ref={dialog} className="modal" onCancel={event => { if (busy) event.preventDefault(); }}><form onSubmit={submit}>
      <div className="modal-heading"><div><span className="eyebrow">משימות</span><h2>{editing ? "עריכת משימה" : "הצעד הבא שלך"}</h2></div><button type="button" className="icon-button" aria-label="סגירת הטופס" disabled={busy || !ready} onClick={() => dialog.current?.close()}><X size={20}/></button></div>
      <label>שם המשימה<input autoFocus required maxLength={200} placeholder="מה תרצה לעשות?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
      <label>תיאור <span className="optional">לא חובה</span><textarea rows={3} maxLength={5000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
      <div className="form-grid"><label>מצב<select aria-label="מצב" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskInput["status"] })}>{taskStatuses.map(s => <option value={s} key={s}>{copy.status[s]}</option>)}</select></label><label>עדיפות<select aria-label="עדיפות" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskInput["priority"] })}>{taskPriorities.map(p => <option value={p} key={p}>{copy.priority[p]}</option>)}</select></label></div>
      <label>תאריך יעד <span className="optional">לא חובה</span><input type="date" value={form.dueDate ?? ""} onChange={e => setForm({ ...form, dueDate: e.target.value || null })}/></label>
      <div className="form-grid"><label>חזרה<select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value as TaskInput['recurrence'] })}>{recurrences.map(value=><option key={value} value={value}>{value === 'NONE' ? 'ללא חזרה' : value === 'DAILY' ? 'בכל יום' : 'בכל שבוע'}</option>)}</select></label>{form.recurrence !== 'NONE'&&<label>חזרה עד <span className="optional">לא חובה</span><input type="date" min={form.dueDate ?? undefined} value={form.recurrenceUntil ?? ''} onChange={e=>setForm({...form,recurrenceUntil:e.target.value||null})}/></label>}</div>
      {form.recurrence !== 'NONE'&&!form.dueDate&&<p className="error-text">יש לבחור תאריך למשימה חוזרת.</p>}{error && <p role="alert" className="error-text">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" disabled={busy || !ready} onClick={() => dialog.current?.close()}>ביטול</button><button className="button primary" disabled={busy || !ready || (form.recurrence !== 'NONE'&&!form.dueDate)}>{busy && <LoaderCircle className="spin" size={16}/>} {busy ? "שומר…" : editing ? "שמירת שינויים" : "הוספת משימה"}</button></div>
    </form></dialog>
    <dialog ref={deleteDialog} className="modal small-modal" onCancel={event => { if (busy) event.preventDefault(); }}><h2>למחוק את המשימה?</h2><p>המשימה „{removing?.title}” תוסר מהרשימה.</p>{error && <p role="alert" className="error-text">{error}</p>}<div className="modal-actions"><button className="button secondary" disabled={busy || !ready} onClick={() => deleteDialog.current?.close()}>שמירת המשימה</button><button className="button danger" disabled={busy || !ready} onClick={async () => { if (removing && await mutate(`/api/tasks/${removing.id}`, "DELETE")) { deleteDialog.current?.close(); setNotice("המשימה נמחקה."); } }}>{busy ? "מוחק…" : "מחיקת משימה"}</button></div></dialog>
  </>;
}
