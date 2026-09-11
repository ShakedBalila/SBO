"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import type { TaskDTO } from '@/lib/tasks';
import type { ModuleRecord } from '@/lib/modules';

export function isoWeek(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
export function MonthCalendar({ tasks, events, today, onWeek }: { tasks: TaskDTO[]; events: ModuleRecord[]; today: string; onWeek: (week: number) => void }) {
  const router = useRouter();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => setReady(true), []);
  const weeks = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    const first = new Date(Date.UTC(year, monthNumber - 1, 1));
    const start = new Date(first);
    start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + week * 7 + day); return date.toISOString().slice(0, 10);
    }));
  }, [month]);
  function move(delta: number) { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + delta); setMonth(date.toISOString().slice(0, 7)); }
  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const values = Object.fromEntries(new FormData(event.currentTarget));
    try { const response = await fetch('/api/modules/events', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(values) }); const body=await response.json(); if(!response.ok) throw new Error(body.error); dialog.current?.close(); router.refresh(); }
    catch(e){ setError(e instanceof Error?e.message:'לא ניתן לשמור את האירוע.'); } finally { setBusy(false); }
  }
  return <section className="calendar-panel"><div className="calendar-heading"><div><h2>לוח שנה חודשי</h2><p>מספרי שבוע, משימות ואירועים</p></div><div className="calendar-actions"><button className="icon-button" aria-label="החודש הקודם" onClick={() => move(-1)}><ChevronRight/></button><strong>{new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01`))}</strong><button className="icon-button" aria-label="החודש הבא" onClick={() => move(1)}><ChevronLeft/></button><button className="button secondary" disabled={!ready} onClick={() => dialog.current?.showModal()}><Plus size={16}/>אירוע</button></div></div>
    <div className="calendar-grid"><div className="week-title">ש׳</div>{['ב׳','ג׳','ד׳','ה׳','ו׳','ש׳','א׳'].map((day,index)=><div className="day-title" key={index}>{day}</div>)}
      {weeks.map((week,index)=><div className="calendar-week" key={index}>
        <button className="week-number" onClick={()=>onWeek(isoWeek(week[0]))} aria-label={`הצגת שבוע ${isoWeek(week[0])}`}>{isoWeek(week[0])}</button>
        {week.map(date=>{const dayTasks=tasks.filter(task=>task.dueDate===date); const dayEvents=events.filter(item=>item.date===date); return <div className={`calendar-day ${date.slice(0,7)!==month?'outside':''} ${date===today?'today':''}`} key={date}><span className="day-number">{Number(date.slice(8))}</span>{dayTasks.slice(0,2).map(task=><span className="calendar-item task-item" title={task.title} key={task.id}>{task.title}</span>)}{dayEvents.slice(0,2).map(item=><span className="calendar-item event-item" title={String(item.title)} key={item.id}>{item.title}</span>)}{dayTasks.length+dayEvents.length>4&&<small>+{dayTasks.length+dayEvents.length-4} נוספים</small>}</div>})}
      </div>)}</div>
    {events.length>0&&<div className="event-list"><h3>אירועים בלוח השנה</h3>{events.filter(event=>String(event.date).slice(0,7)===month).map(event=><div key={event.id}><span><strong>{event.title}</strong><small>{event.type} · {new Intl.DateTimeFormat('he-IL',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(String(event.date)))}</small></span><button className="icon-button" aria-label={`מחיקת ${event.title}`} onClick={async()=>{setBusy(true);await fetch(`/api/modules/events/${event.id}`,{method:'DELETE'});setBusy(false);router.refresh();}} disabled={busy}><Trash2 size={15}/></button></div>)}</div>}
    <dialog className="modal" ref={dialog}><form onSubmit={addEvent}><div className="modal-heading"><h2>הוספת אירוע ללוח השנה</h2><button className="icon-button" type="button" aria-label="סגירה" onClick={()=>dialog.current?.close()}><X/></button></div><label>שם האירוע<input name="title" required maxLength={200}/></label><label>סוג<select name="type" defaultValue="אחר">{['חג','אימון','יום הולדת','פגישה','אחר'].map(type=><option key={type}>{type}</option>)}</select></label><label>תאריך<input name="date" type="date" required defaultValue={`${month}-01`}/></label><label>הערות <span className="optional">לא חובה</span><textarea name="notes" maxLength={2000}/></label>{error&&<p className="error-text">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={()=>dialog.current?.close()}>ביטול</button><button className="button primary" disabled={busy}>{busy?'שומר…':'שמירת אירוע'}</button></div></form></dialog>
  </section>;
}
