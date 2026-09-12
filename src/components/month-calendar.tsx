"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";
import type { TaskDTO } from "@/lib/tasks";
import type { ModuleRecord } from "@/lib/modules";

export function isoWeek(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
const emptyEvent = (date: string) => ({ title: "", type: "אחר", date, endDate: null as string | null, time: null as string | null, recurrence: "NONE", recurrenceDays: [] as number[], recurrenceUntil: null as string | null, reminderMinutes: null as number | null, notes: "" });
const recurrenceLabels: Record<string,string> = { NONE: "ללא חזרה", DAILY: "יומי", WEEKLY: "שבועי", MONTHLY: "חודשי", CUSTOM: "ימים נבחרים" };
const dayLabels = [{v:0,l:"א׳"},{v:1,l:"ב׳"},{v:2,l:"ג׳"},{v:3,l:"ד׳"},{v:4,l:"ה׳"},{v:5,l:"ו׳"},{v:6,l:"ש׳"}];
function occurs(item: Record<string, unknown>, date: string, isEvent = false) {
  const start = String(item.date ?? item.dueDate ?? "");
  if (!start || date < start) return false;
  const until = item.recurrenceUntil ? String(item.recurrenceUntil) : null;
  if (until && date > until) return false;
  const recurrence = String(item.recurrence ?? "NONE");
  if (recurrence === "NONE") return isEvent ? date <= String(item.endDate ?? start) : date === start;
  const current = new Date(`${date}T00:00:00Z`), base = new Date(`${start}T00:00:00Z`);
  if (recurrence === "DAILY") return true;
  if (recurrence === "WEEKLY") return current.getUTCDay() === base.getUTCDay();
  if (recurrence === "MONTHLY") return current.getUTCDate() === base.getUTCDate();
  return Array.isArray(item.recurrenceDays) && (item.recurrenceDays as number[]).includes(current.getUTCDay());
}
export function MonthCalendar({ tasks, events, today, onWeek, onTaskClick }: { tasks: TaskDTO[]; events: ModuleRecord[]; today: string; onWeek: (week: number) => void; onTaskClick: (task: TaskDTO) => void }) {
  const router = useRouter();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [form, setForm] = useState(emptyEvent(`${today.slice(0,7)}-01`));
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => setReady(true), []);
  const weeks = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = new Date(Date.UTC(year, monthNumber - 1, 1));
    const start = new Date(first); start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => { const value = new Date(start); value.setUTCDate(start.getUTCDate() + w * 7 + d); return value.toISOString().slice(0, 10); }));
  }, [month]);
  function move(delta: number) { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + delta); setMonth(date.toISOString().slice(0, 7)); }
  function editEvent(event: ModuleRecord | null, date = `${month}-01`) {
    setEditing(event); setError("");
    setForm(event ? { title:String(event.title), type:String(event.type ?? "אחר"), date:String(event.date), endDate:event.endDate ? String(event.endDate) : null, time:event.time ? String(event.time) : null, recurrence:String(event.recurrence ?? "NONE"), recurrenceDays:Array.isArray(event.recurrenceDays) ? event.recurrenceDays as number[] : [], recurrenceUntil:event.recurrenceUntil ? String(event.recurrenceUntil) : null, reminderMinutes:event.reminderMinutes === null || event.reminderMinutes === undefined ? null : Number(event.reminderMinutes), notes:String(event.notes ?? "") } : emptyEvent(date));
    dialog.current?.showModal();
  }
  async function saveEvent(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const response = await fetch(`/api/modules/events${editing ? `/${editing.id}` : ""}`, { method:editing ? "PATCH" : "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) }); const body=await response.json(); if(!response.ok) throw new Error(body.error); dialog.current?.close(); router.refresh(); }
    catch(e){ setError(e instanceof Error?e.message:"לא ניתן לשמור את האירוע."); } finally { setBusy(false); }
  }
  async function removeEvent() { if (!editing) return; setBusy(true); const response = await fetch(`/api/modules/events/${editing.id}`, {method:"DELETE"}); setBusy(false); if (response.ok) { dialog.current?.close(); router.refresh(); } else setError("לא ניתן למחוק את האירוע."); }
  return <section className="calendar-panel"><div className="calendar-heading"><div><h2>לוח שנה חודשי</h2><p>מספרי שבוע, משימות ואירועים</p></div><div className="calendar-actions"><button className="icon-button" aria-label="החודש הקודם" onClick={() => move(-1)}><ChevronRight/></button><strong>{new Intl.DateTimeFormat("he-IL",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${month}-01`))}</strong><button className="icon-button" aria-label="החודש הבא" onClick={() => move(1)}><ChevronLeft/></button><button className="button secondary" disabled={!ready} onClick={() => editEvent(null)}><Plus size={16}/>אירוע</button></div></div>
    <div className="calendar-grid"><div className="week-title">ש׳</div>{["ב׳","ג׳","ד׳","ה׳","ו׳","ש׳","א׳"].map((day,index)=><div className="day-title" key={index}>{day}</div>)}
      {weeks.map((week,index)=><div className="calendar-week" key={index}><button className="week-number" onClick={()=>onWeek(isoWeek(week[0]))} aria-label={`הצגת שבוע ${isoWeek(week[0])}`}>{isoWeek(week[0])}</button>{week.map(date=>{const dayTasks=tasks.filter(task=>task.showOnCalendar&&occurs(task as unknown as Record<string,unknown>,date)); const dayEvents=events.filter(item=>occurs(item,date,true)); return <div className={`calendar-day ${date.slice(0,7)!==month?"outside":""} ${date===today?"today":""}`} key={date} onDoubleClick={()=>editEvent(null,date)}><span className="day-number">{Number(date.slice(8))}</span>{dayTasks.slice(0,2).map(task=><button className="calendar-item task-item" title={task.title} key={task.id} onClick={()=>onTaskClick(task)}>{task.time&&<small>{task.time}</small>}{task.title}</button>)}{dayEvents.slice(0,2).map(item=><button className="calendar-item event-item" title={String(item.title)} key={String(item.id)} onClick={()=>editEvent(item)}>{item.time&&<small>{String(item.time)}</small>}{item.title}</button>)}{dayTasks.length+dayEvents.length>4&&<small>+{dayTasks.length+dayEvents.length-4} נוספים</small>}</div>})}</div>)}</div>
    <div className="event-list"><h3>אירועים בחודש</h3>{events.filter(event=>String(event.date).slice(0,7)===month).length ? events.filter(event=>String(event.date).slice(0,7)===month).map(event=><button className="event-row-button" key={String(event.id)} onClick={()=>editEvent(event)}><span><strong>{event.title}</strong><small>{event.type} · {new Intl.DateTimeFormat("he-IL",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(String(event.date)))}{event.endDate&&event.endDate!==event.date?` – ${new Intl.DateTimeFormat("he-IL",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(String(event.endDate)))}`:""}</small></span></button>) : <p className="journal-empty">טרם נקבעו אירועים לחודש זה.</p>}</div>
    <dialog className="modal" ref={dialog}><form onSubmit={saveEvent}><div className="modal-heading"><div><span className="eyebrow">לוח שנה</span><h2>{editing?"עריכת אירוע":"אירוע חדש"}</h2></div><button className="icon-button" type="button" aria-label="סגירה" onClick={()=>dialog.current?.close()}><X/></button></div><label>שם המשימה / האירוע<input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>קטגוריה <span className="optional">לא חובה</span><input maxLength={30} placeholder="למשל: חג, אימון, יום הולדת" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}/></label><div className="form-grid"><label>תאריך התחלה<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>תאריך סיום <span className="optional">לא חובה</span><input type="date" min={form.date} value={form.endDate??""} onChange={e=>setForm({...form,endDate:e.target.value||null})}/></label></div><div className="form-grid"><label>שעה <span className="optional">לא חובה</span><input type="time" value={form.time??""} onChange={e=>setForm({...form,time:e.target.value||null})}/></label><label>התראה<select value={form.reminderMinutes??""} onChange={e=>setForm({...form,reminderMinutes:e.target.value===""?null:Number(e.target.value)})}><option value="">ללא התראה</option><option value="0">בזמן האירוע</option><option value="10">10 דקות לפני</option><option value="60">שעה לפני</option><option value="1440">יום לפני</option></select></label></div><div className="form-grid"><label>חזרתיות<select value={form.recurrence} onChange={e=>setForm({...form,recurrence:e.target.value})}>{Object.entries(recurrenceLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>{form.recurrence!=="NONE"&&<label>חזרה עד <span className="optional">לא חובה</span><input type="date" min={form.date} value={form.recurrenceUntil??""} onChange={e=>setForm({...form,recurrenceUntil:e.target.value||null})}/></label>}</div>{form.recurrence==="CUSTOM"&&<fieldset className="weekday-picker"><legend>ימים בשבוע</legend>{dayLabels.map(day=><label key={day.v}><input type="checkbox" checked={form.recurrenceDays.includes(day.v)} onChange={()=>setForm({...form,recurrenceDays:form.recurrenceDays.includes(day.v)?form.recurrenceDays.filter(v=>v!==day.v):[...form.recurrenceDays,day.v]})}/>{day.l}</label>)}</fieldset>}<label>הערות <span className="optional">לא חובה</span><textarea maxLength={2000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>{error&&<p className="error-text">{error}</p>}<div className="modal-actions">{editing&&<button type="button" className="button danger" disabled={busy} onClick={removeEvent}><Trash2 size={16}/>מחיקה</button>}<button type="button" className="button secondary" onClick={()=>dialog.current?.close()}>ביטול</button><button className="button primary" disabled={busy}>{busy?"שומר…":"שמירת אירוע"}</button></div></form></dialog>
  </section>;
}
