"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X, CarFront, Utensils, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ModuleRecord, RecordKind } from '@/lib/modules';
import { NutritionScanner } from '@/components/nutrition-scanner';
import { WaterBottleIcon } from '@/components/water-bottle-icon';

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date'; min?: number; max?: number; step?: string; optional?: boolean; hidden?: boolean; options?: { value: string; label: string }[] };
type Summary = { today: string; waterMl: number; calories: number; proteinG: number; fuelCost: number; waterGoalMl: number | null; calorieGoal: number | null; proteinGoalG: number | null; currency: string; age:number|null;sex:string|null;heightCm:number|null;weightKg:number|null;activityLevel:string|null;weightGoal:string|null;waterReminderEnabled:boolean;waterReminderStart:string;waterReminderEnd:string;waterReminderIntervalMinutes:number };
const dateField: Field = { key: 'date', label: 'תאריך', type: 'date' };
const numberField = (key: string, label: string, max: number, min = 0, step = '1'): Field => ({ key, label, type: 'number', min, max, step });
const prettyDate = (value: unknown) => new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(String(value)));
async function save(kind: string, data?: object, id?: string, remove = false) {
  const result = await fetch(`/api/modules/${kind}${id ? `/${id}` : ''}`, {
    method: remove ? 'DELETE' : id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined
  });
  const body = await result.json();
  if (!result.ok) throw new Error(body.error ?? 'לא ניתן לשמור. נסה שוב.');
}

function RecordPanel({ kind, title, action, fields, records, defaults, describe, disabled = false, externalDraft, onDraftConsumed, confirmDeletion = true }: {
  kind: RecordKind; title: string; action: string; fields: Field[]; records: ModuleRecord[];
  defaults: Record<string, string | number | null>; describe: (record: ModuleRecord) => { title: string; detail: string };
  disabled?: boolean;
  externalDraft?: Record<string,string|number|null> | null; onDraftConsumed?:()=>void;
  confirmDeletion?: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const deletion = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [removing, setRemoving] = useState<ModuleRecord | null>(null);
  const [values, setValues] = useState<Record<string, string | number | null>>(defaults);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removedIds,setRemovedIds]=useState<Set<string>>(new Set());
  useEffect(() => setReady(true), []);
  useEffect(()=>{if(externalDraft){setEditing(null);setValues(externalDraft);setError('');dialog.current?.showModal();onDraftConsumed?.();}},[externalDraft,onDraftConsumed]);
  function edit(record: ModuleRecord | null) {
    const recordValues:Record<string,string|number|null>={...defaults};
    if(record) for(const field of fields){const value=record[field.key];recordValues[field.key]=typeof value==='string'||typeof value==='number'||value===null?value:null;}
    setError(''); setEditing(record); setValues(recordValues); dialog.current?.showModal();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(fields.map(field => {
      const value = values[field.key];
      return [field.key, field.type === 'number' ? (value === '' || value === null || value === undefined) && field.optional ? null : Number(value) : value ?? ''];
    }));
    try { await save(kind, data, editing?.id); dialog.current?.close(); setMessage('נשמר.'); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן להתחבר. נסה שוב.'); }
    finally { setBusy(false); }
  }
  async function removeRecord(record:ModuleRecord){
    setBusy(true);setError('');setRemovedIds(current=>new Set(current).add(record.id));
    try{await save(kind,undefined,record.id,true);setMessage('נמחק.');router.refresh();}
    catch(e){setRemovedIds(current=>{const next=new Set(current);next.delete(record.id);return next;});setError(e instanceof Error?e.message:'לא ניתן למחוק.');}
    finally{setBusy(false);}
  }
  const visibleRecords=records.filter(record=>!removedIds.has(record.id));
  return <section className="journal-panel">
    <div className="section-heading"><div><h2>{title}</h2><p>{kind === 'vehicles' ? 'הרכבים שלך' : 'רשומות אחרונות · עד 200 מוצגות'}</p></div>
      <button className="button primary" disabled={disabled || !ready || busy} onClick={() => edit(null)}><Plus size={17}/>{action}</button>
    </div>
    <p className="feedback" role="status">{message}</p>
    {disabled && <p className="module-hint">יש להוסיף רכב כדי להתחיל לתעד תדלוקים.</p>}
    {visibleRecords.length === 0 ? <div className="journal-empty">עדיין אין רשומות. {disabled ? 'היסטוריית התדלוקים תופיע כאן.' : `אפשר לבחור „${action}” כדי להתחיל.`}</div> :
      <div className="journal-list">{visibleRecords.map(record => {
        const text = describe(record);
        return <article key={record.id} className="journal-row"><div><h3>{text.title}</h3><p>{text.detail}</p></div><div className="row-actions">
          <button className="icon-button" disabled={!ready || busy} aria-label={`עריכת ${text.title}`} onClick={() => edit(record)}><Pencil size={17}/></button>
          <button className="icon-button" disabled={!ready || busy} aria-label={`מחיקת ${text.title}`} onClick={() => {if(confirmDeletion){setRemoving(record);setError('');deletion.current?.showModal();}else void removeRecord(record);}}><Trash2 size={17}/></button>
        </div></article>;
      })}</div>}
    <dialog className="modal" ref={dialog} onCancel={event => { if (busy) event.preventDefault(); }}><form onSubmit={submit}>
      <div className="modal-heading"><h2>{editing ? `עריכת רשומה: ${title}` : action}</h2><button type="button" className="icon-button" disabled={busy} aria-label="סגירת הטופס" onClick={() => dialog.current?.close()}><X size={20}/></button></div>
      {fields.filter(field=>!field.hidden).map(field => <label key={field.key} htmlFor={`${kind}-${field.key}`}>{field.label}{field.optional && <span className="optional">(לא חובה)</span>}
        {field.options ? <select id={`${kind}-${field.key}`} required value={String(values[field.key] ?? '')} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> :
          <input id={`${kind}-${field.key}`} type={field.type ?? 'text'} required={!field.optional} min={field.min} max={field.max} maxLength={field.type === undefined || field.type === 'text' ? field.max ?? 200 : undefined} step={field.step} value={values[field.key] ?? ''} onChange={event => setValues({ ...values, [field.key]: event.target.value })}/>}
      </label>)}
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>ביטול</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'שומר…' : 'שמירת רשומה'}</button></div>
    </form></dialog>
    <dialog className="modal small-modal" ref={deletion} onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2>למחוק את {kind === 'vehicles' ? 'הרכב' : 'הרשומה'}?</h2><p>{kind === 'vehicles' ? 'הרכב וכל התדלוקים שלו יימחקו לצמיתות.' : 'הרשומה תימחק לצמיתות.'}</p>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => deletion.current?.close()}>ביטול</button><button className="button danger" disabled={busy} onClick={async () => {
        if (!removing) return; setBusy(true); setError('');
        try { await save(kind, undefined, removing.id, true); deletion.current?.close(); setMessage('נמחק.'); router.refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן למחוק.'); } finally { setBusy(false); }
      }}>{busy ? 'מוחק…' : 'מחיקה'}</button></div>
    </dialog>
  </section>;
}

function Goals({ module, summary }: { module: 'water' | 'nutrition'; summary: Summary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => setReady(true), []);
  const fields = module === 'water' ? [{ key: 'waterGoalMl', label: 'יעד מים יומי (מ״ל)', value: summary.waterGoalMl, max: 20000 }] :
    [{ key: 'calorieGoal', label: 'יעד קלוריות יומי', value: summary.calorieGoal, max: 20000 }, { key: 'proteinGoalG', label: 'יעד חלבון יומי (גרם)', value: summary.proteinGoalG, max: 2000 }];
  const activityFactors:Record<string,number>={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
  const canCalculate=summary.age&&summary.sex&&summary.heightCm&&summary.weightKg&&summary.activityLevel&&summary.weightGoal;
  const bmr=canCalculate?Math.round(10*summary.weightKg!+6.25*summary.heightCm!-5*summary.age!+(summary.sex==='male'?5:-161)):null;
  const tdee=bmr?Math.round(bmr*activityFactors[summary.activityLevel!]):null;
  return <section className="goals-panel"><h2>{module==='water'?'היעד היומי שלך':'יעדים וחילוף חומרים'}</h2><p>הנתונים והיעדים נשמרים עד לשינוי הבא.</p>{module==='nutrition'&&<div className="metabolism-cards"><div><small>BMR</small><strong>{bmr?.toLocaleString('he-IL')??'—'}</strong><span>קלוריות במנוחה</span></div><div><small>TDEE</small><strong>{tdee?.toLocaleString('he-IL')??'—'}</strong><span>הוצאה יומית משוערת</span></div></div>}<form onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const data:Record<string,string|number|null>=Object.fromEntries(fields.map(field => [field.key, form.get(field.key) ? Number(form.get(field.key)) : null]));
    if(module==='nutrition'){
      data.age=form.get('age')?Number(form.get('age')):null;data.sex=String(form.get('sex')||'')||null;data.heightCm=form.get('heightCm')?Number(form.get('heightCm')):null;data.weightKg=form.get('weightKg')?Number(form.get('weightKg')):null;data.activityLevel=String(form.get('activityLevel')||'')||null;data.weightGoal=String(form.get('weightGoal')||'')||null;
      if(event.nativeEvent instanceof SubmitEvent && (event.nativeEvent.submitter as HTMLButtonElement)?.value==='calculate'&&data.age&&data.sex&&data.heightCm&&data.weightKg&&data.activityLevel&&data.weightGoal){const base=Math.round(10*Number(data.weightKg)+6.25*Number(data.heightCm)-5*Number(data.age)+(data.sex==='male'?5:-161));const expenditure=Math.round(base*activityFactors[String(data.activityLevel)]);data.calorieGoal=expenditure+(data.weightGoal==='lose'?-500:data.weightGoal==='gain'?300:0);data.proteinGoalG=Math.round(Number(data.weightKg)*(data.weightGoal==='gain'?1.8:1.6));}
    }
    try { await save('goals', data); setMessage('היעדים נשמרו.'); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן לשמור.'); } finally { setBusy(false); }
  }}>{module==='nutrition'&&<><label>גיל<input name="age" type="number" min="13" max="120" defaultValue={summary.age??''}/></label><label>מין לחישוב<select name="sex" defaultValue={summary.sex??''}><option value="">בחירה</option><option value="male">זכר</option><option value="female">נקבה</option></select></label><label>גובה (ס״מ)<input name="heightCm" type="number" min="100" max="250" defaultValue={summary.heightCm??''}/></label><label>משקל (ק״ג)<input name="weightKg" type="number" min="30" max="400" step="0.1" defaultValue={summary.weightKg??''}/></label><label>רמת פעילות<select name="activityLevel" defaultValue={summary.activityLevel??''}><option value="">בחירה</option><option value="sedentary">מעטה</option><option value="light">קלה</option><option value="moderate">בינונית</option><option value="active">גבוהה</option><option value="very_active">גבוהה מאוד</option></select></label><label>מטרה<select name="weightGoal" defaultValue={summary.weightGoal??''}><option value="">בחירה</option><option value="lose">ירידה במשקל</option><option value="maintain">שמירה על המשקל</option><option value="gain">עלייה במשקל / מסה</option></select></label></>}{fields.map(field => <label key={field.key}>{field.label}<input name={field.key} type="number" min={1} max={field.max} step="1" defaultValue={field.value ?? ''}/></label>)}
    <div className="goal-actions">{module==='nutrition'&&<button className="button primary" name="action" value="calculate" disabled={busy||!ready}>חישוב ועדכון יעדים</button>}<button className="button secondary" disabled={busy || !ready}>{busy ? 'שומר…' : 'שמירה ידנית'}</button></div>
  </form>{error && <p className="error-text" role="alert">{error}</p>}<p className="feedback" role="status">{message}</p></section>;
}

function sundayWeek(value:Date){const start=new Date(Date.UTC(value.getUTCFullYear(),0,1));start.setUTCDate(start.getUTCDate()-start.getUTCDay());return Math.floor((value.getTime()-start.getTime())/(7*86400000))+1;}

function WaterDashboard({amount,goal,records,today}:{amount:number;goal:number|null;records:ModuleRecord[];today:string}){
  const [weekOffset,setWeekOffset]=useState(0);
  const percent=goal?Math.round(amount/goal*100):0,fill=Math.min(100,Math.max(0,percent));
  const todayDate=new Date(`${today}T00:00:00Z`);
  const weekStart=new Date(todayDate);weekStart.setUTCDate(weekStart.getUTCDate()-weekStart.getUTCDay()+weekOffset*7);
  const days=Array.from({length:7},(_,index)=>{const date=new Date(weekStart);date.setUTCDate(date.getUTCDate()+index);const key=date.toISOString().slice(0,10),total=records.filter(record=>String(record.date)===key).reduce((sum,record)=>sum+Number(record.amountMl),0);return {key,total,label:new Intl.DateTimeFormat('he-IL',{weekday:'narrow',timeZone:'UTC'}).format(date)};});
  const weekNumber=sundayWeek(weekStart),weekTotal=days.reduce((sum,day)=>sum+day.total,0);
  return <section className="water-dashboard-card">
    <div className="hydration-vessel" role="progressbar" aria-label="התקדמות בצריכת המים היומית" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill}>
      <div className="hydration-water" style={{height:`${fill}%`}}><i/><i/><i/></div>
      <div className="hydration-reading"><strong>{amount.toLocaleString('he-IL')}</strong><span>מתוך {goal?.toLocaleString('he-IL')??'—'} מ״ל</span><b>{percent}%</b></div>
    </div>
    <div className="water-week"><div className="water-week-heading"><button type="button" aria-label="השבוע הקודם" onClick={()=>setWeekOffset(value=>value-1)}><ChevronRight/></button><div><span>צריכת מים לשבוע {weekNumber}</span><strong>{weekTotal.toLocaleString('he-IL')} מ״ל</strong></div><button type="button" aria-label="השבוע הבא" disabled={weekOffset===0} onClick={()=>setWeekOffset(value=>Math.min(0,value+1))}><ChevronLeft/></button></div><div className="water-week-bars">{days.map(day=>{const dayPercent=goal?Math.min(100,day.total/goal*100):0;return <div className={day.key===today?'today':''} key={day.key}><span><i style={{height:`${dayPercent}%`}}/></span><small>{day.label}</small></div>})}</div></div>
  </section>;
}

function WaterServingIcon({amount}:{amount:number}){
  if(amount===250)return <svg className="water-serving-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M14 8h20l-3 32H17L14 8Z"/><path d="M17 27c5-3 9 3 14 0l-1 11H18l-1-11Z" className="fill"/></svg>;
  if(amount===750)return <svg className="water-serving-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M17 10h14l2 5-2 25H17l-2-25 2-5Z"/><path d="M16 16h16M19 7h10M20 4h8"/><path d="M18 24h12l-1 14H19l-1-14Z" className="fill"/></svg>;
  const large=amount===1000;
  return <svg className={`water-serving-icon ${large?'large':''}`} viewBox="0 0 48 48" aria-hidden="true"><path d="M20 5h8v5l4 5v25H16V15l4-5V5Z"/><path d="M18 25h12v13H18V25Z" className="fill"/><path d="M20 9h8"/></svg>;
}

function decodeKey(value:string){const padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64);return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)));}

function WaterReminders({summary}:{summary:Summary}){
  const [enabled,setEnabled]=useState(summary.waterReminderEnabled),[start,setStart]=useState(summary.waterReminderStart),[end,setEnd]=useState(summary.waterReminderEnd),[interval,setInterval]=useState(summary.waterReminderIntervalMinutes);
  const [deviceReady,setDeviceReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let active=true;(async()=>{if(!('serviceWorker' in navigator)||!('PushManager' in window))return;const registration=await navigator.serviceWorker.ready;const subscription=await registration.pushManager.getSubscription();if(active)setDeviceReady(Boolean(subscription)&&Notification.permission==='granted');})().catch(()=>{});return()=>{active=false;};},[]);
  async function enableDevice(){if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('הדפדפן הזה אינו תומך בהתראות Push.');const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('לא ניתנה הרשאה להתראות.');const registration=await navigator.serviceWorker.ready,existing=await registration.pushManager.getSubscription(),config=await fetch('/api/push/subscriptions').then(response=>response.json());if(!config.publicKey)throw new Error('שירות ההתראות עדיין לא הוגדר בשרת.');const subscription=existing??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});const response=await fetch('/api/push/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription.toJSON())});if(!response.ok)throw new Error('לא ניתן לשמור את המכשיר להתראות.');setDeviceReady(true);}
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage('');setError('');try{if(enabled&&!deviceReady)await enableDevice();await save('water-reminders',{enabled,startTime:start,endTime:end,intervalMinutes:interval});setMessage(enabled?'תזכורות השתייה נשמרו ויישלחו גם כשהאתר סגור.':'תזכורות השתייה כובו.');}catch(e){setError(e instanceof Error?e.message:'לא ניתן לשמור את התזכורות.');}finally{setBusy(false);}}
  return <section className="water-reminders"><div className="water-reminder-title"><span><Bell/></span><div><h2>תזכורות שתייה</h2><p>בחירת שעות קבועות שבהן SBO יזכיר לך לשתות.</p></div></div><form onSubmit={submit}><label className="water-reminder-toggle"><span>תזכורות פעילות</span><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/><i aria-hidden="true"/></label><div className="water-reminder-grid"><label>שעת התחלה<input type="time" required value={start} onChange={event=>setStart(event.target.value)}/></label><label>שעת סיום<input type="time" required value={end} onChange={event=>setEnd(event.target.value)}/></label><label>תדירות<select value={interval} onChange={event=>setInterval(Number(event.target.value))}><option value={30}>כל חצי שעה</option><option value={60}>כל שעה</option><option value={90}>כל שעה וחצי</option><option value={120}>כל שעתיים</option><option value={180}>כל 3 שעות</option><option value={240}>כל 4 שעות</option></select></label></div><button className="button primary" disabled={busy}>{busy?'שומר…':'שמירת תזכורות'}</button></form>{enabled&&!deviceReady&&<p className="module-hint">בעת השמירה תתבקש לאשר התראות במכשיר הזה. באייפון ובאייפד יש להוסיף את SBO למסך הבית ולפתוח אותו משם פעם אחת.</p>}{message&&<p className="feedback" role="status">{message}</p>}{error&&<p className="error-text" role="alert">{error}</p>}</section>;
}

function MonthlyCostChart({fuel,policies,reminders,expenses,currency}:{fuel:ModuleRecord[];policies:ModuleRecord[];reminders:ModuleRecord[];expenses:ModuleRecord[];currency:string}){
  const format=new Intl.NumberFormat('he-IL',{style:'currency',currency,maximumFractionDigits:0});
  const now=new Date(), months=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));return {key:d.toISOString().slice(0,7),label:new Intl.DateTimeFormat('he-IL',{month:'short',timeZone:'UTC'}).format(d),fuel:0,insurance:0,maintenance:0,other:0};});
  for(const row of fuel){const month=months.find(m=>m.key===String(row.date).slice(0,7));if(month)month.fuel+=Number(row.liters)*Number(row.pricePerLiter);}
  for(const row of policies){for(const month of months){if(month.key>=String(row.startDate).slice(0,7)&&month.key<=String(row.endDate).slice(0,7))month.insurance+=Number(row.annualCost)/12;}}
  for(const row of reminders){const month=months.find(m=>m.key===String(row.dueDate).slice(0,7));if(month)month.maintenance+=Number(row.cost||0);}
  for(const row of expenses){const month=months.find(m=>m.key===String(row.date).slice(0,7));if(month){if(row.type==='Maintenance'||row.type==='Repair'||row.type==='Test')month.maintenance+=Number(row.amount);else month.other+=Number(row.amount);}}
  const max=Math.max(1,...months.map(m=>m.fuel+m.insurance+m.maintenance+m.other));
  return <section className="cost-chart"><div className="section-heading"><div><h2>עלויות לפי חודשים</h2><p>דלק, ביטוח, טיפולים והוצאות נוספות</p></div></div><div className="chart-legend"><span className="fuel">דלק</span><span className="insurance">ביטוח</span><span className="maintenance">טיפולים ותיקונים</span><span className="other">אחר</span></div><div className="bars">{months.map(month=>{const total=month.fuel+month.insurance+month.maintenance+month.other;return <div className="bar-column" key={month.key}><small>{total?format.format(total):'—'}</small><div className="bar" style={{height:`${Math.max(4,total/max*180)}px`}}>{(['fuel','insurance','maintenance','other'] as const).map(type=><span key={type} className={type} style={{height:`${total?month[type]/total*100:0}%`}} title={`${type}: ${format.format(month[type])}`}/>)}</div><strong>{month.label}</strong></div>})}</div></section>;
}

export function ModuleWorkspace({ module, summary, water, vehicles, fuel, nutrition, policies, reminders, expenses, fuelPrice }: { module: 'water' | 'car' | 'nutrition'; summary: Summary; water: ModuleRecord[]; vehicles: ModuleRecord[]; fuel: ModuleRecord[]; nutrition: ModuleRecord[]; policies: ModuleRecord[]; reminders: ModuleRecord[]; expenses:ModuleRecord[]; fuelPrice: { price:number; sourceUrl:string; checkedAt:string; online:boolean } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [displayWaterMl,setDisplayWaterMl]=useState(summary.waterMl);
  const [nutritionDraft,setNutritionDraft]=useState<Record<string,string|number|null>|null>(null);
  useEffect(() => { setReady(true); const refresh = () => router.refresh(); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [router]);
  useEffect(()=>setDisplayWaterMl(summary.waterMl),[summary.waterMl]);
  const title = { water: 'צריכת מים יומית', car: 'רכב', nutrition: 'תזונה' }[module];
  const Icon = { water: WaterBottleIcon, car: CarFront, nutrition: Utensils }[module];
  const formatMoney = (value: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: summary.currency }).format(value);
  const vehicleName = (id: unknown) => String(vehicles.find(vehicle => vehicle.id === id)?.name ?? 'רכב');
  const policyType = (value: unknown) => ({ Mandatory: 'חובה', Comprehensive: 'מקיף', 'Third party': 'צד ג׳' }[String(value)] ?? String(value));
  const reminderType = (value: unknown) => ({ Maintenance: 'טיפול', Test: 'טסט' }[String(value)] ?? String(value));
  const insuranceMonthly = policies.reduce((sum,row)=>sum+Number(row.annualCost)/12,0);
  const upcoming = reminders.filter(row=>String(row.dueDate)>=summary.today&&String(row.dueDate)<=new Date(new Date(`${summary.today}T00:00:00Z`).getTime()+30*86400000).toISOString().slice(0,10));
  return <div className={`module-workspace ${module}-workspace`}>
    <div className="topline"><span>סביבת עבודה <span className="crumb">/</span><strong>{title}</strong></span><span>{prettyDate(summary.today)}</span></div>
    <header className={`page-heading ${module==='water'?'water-page-heading':''}`}><div>{module!=='water'&&<span className="eyebrow">היום־יום שלך</span>}<h1>{title}</h1>{module!=='water'&&<p>{module === 'car' ? 'הרכבים וההוצאות שלך במקום אחד.' : 'הארוחות והיעדים היומיים מול העיניים.'}</p>}</div><span className={`module-icon ${module}-card`}><Icon/></span></header>
    <section className="module-stats" aria-label={`סיכום ${title}`}>
      {module === 'water' && <><div><small>צריכת מים יומית</small><strong>{displayWaterMl.toLocaleString('he-IL')} <span>מ״ל</span></strong></div><div><small>יעד יומי</small><strong>{summary.waterGoalMl?.toLocaleString('he-IL') ?? 'לא הוגדר'} <span>{summary.waterGoalMl ? 'מ״ל' : ''}</span></strong></div><div><small>התקדמות</small><strong>{summary.waterGoalMl ? `${Math.round(displayWaterMl / summary.waterGoalMl * 100)}%` : '—'}</strong></div></>}
      {module === 'car' && <><div><small>בנזין 95 · ישראל</small><strong>{formatMoney(fuelPrice?.price ?? 0)} <span>לליטר</span></strong><small>{fuelPrice?.online?'עודכן מהאינטרנט':'מחיר אחרון שנבדק'} · שירות עצמי</small></div><div><small>דלק החודש</small><strong>{formatMoney(summary.fuelCost)}</strong></div><div><small>ביטוח לחודש</small><strong>{formatMoney(insuranceMonthly)}</strong></div><div><small>התראות קרובות</small><strong>{upcoming.length}</strong></div></>}
      {module === 'nutrition' && <><div><small>קלוריות היום</small><strong>{summary.calories.toLocaleString('he-IL')} <span>קלוריות</span></strong><small>{summary.calorieGoal ? `יעד: ${summary.calorieGoal.toLocaleString('he-IL')}` : 'לא הוגדר יעד'}</small></div><div><small>חלבון היום</small><strong>{summary.proteinG.toLocaleString('he-IL')} <span>גרם</span></strong><small>{summary.proteinGoalG ? `יעד: ${summary.proteinGoalG.toLocaleString('he-IL')} גרם` : 'לא הוגדר יעד'}</small></div></>}
    </section>
    {module === 'water' && <>
      <WaterDashboard amount={displayWaterMl} goal={summary.waterGoalMl} records={water} today={summary.today}/>
      <div className="quick-water"><h2>הוספת שתייה מהירה</h2><div>{[250, 500, 750, 1000].map(amount => <button key={amount} className="button secondary" disabled={busy || !ready} onClick={async () => {
        setBusy(true); setError(''); setMessage(''); setDisplayWaterMl(current=>current+amount);
        try { await save('water', { amountMl: amount, date: summary.today }); setMessage(`נוספו ${amount} מ״ל.`); router.refresh(); }
        catch (e) { setDisplayWaterMl(current=>Math.max(0,current-amount));setError(e instanceof Error ? e.message : 'לא ניתן לשמור.'); } finally { setBusy(false); }
      }}><WaterServingIcon amount={amount}/><span>{amount} מ״ל</span></button>)}</div><p role="status" className="feedback">{message}</p>{error && <p role="alert" className="error-text">{error}</p>}</div>
      <WaterReminders summary={summary}/>
      <RecordPanel kind="water" title="היסטוריית שתייה" action="הוספת מים" fields={[numberField('amountMl', 'כמות (מ״ל)', 10000, 1), dateField]} records={water.slice(0,200)} defaults={{ amountMl: 250, date: summary.today }} confirmDeletion={false} describe={row => ({ title: `${row.amountMl} מ״ל`, detail: prettyDate(row.date) })}/>
      <Goals module="water" summary={summary}/>
    </>}
    {module === 'car' && <>
      {fuelPrice&&<p className="source-note">{fuelPrice.online?'המחיר המרבי בשירות עצמי עודכן מהאינטרנט':'בדיקת המחיר באינטרנט אינה זמינה; מוצג המחיר המאומת האחרון'}: {formatMoney(fuelPrice.price)} לליטר. <a href={fuelPrice.sourceUrl} target="_blank" rel="noreferrer">צפייה במקור</a></p>}
      {upcoming.length>0&&<section className="alerts-panel"><h2>אירועים ב־30 הימים הקרובים</h2>{upcoming.map(row=><p key={row.id}><strong>{row.title}</strong> · {vehicleName(row.vehicleId)} · {prettyDate(row.dueDate)}</p>)}</section>}
      <MonthlyCostChart fuel={fuel} policies={policies} reminders={reminders} expenses={expenses} currency={summary.currency}/>
      <RecordPanel kind="vehicles" title="רכבים" action="הוספת רכב" records={vehicles} fields={[{ key: 'name', label: 'שם הרכב', max: 100 }, { key: 'licensePlate', label: 'מספר רישוי', optional: true, max: 30 }, { ...numberField('year', 'שנת ייצור', 2100, 1900), optional: true }, numberField('odometerKm', 'קילומטראז׳ נוכחי', 10000000), numberField('fuelTankLiters','נפח מכל הדלק (ליטר)',1000,1,'0.1')]} defaults={{ name: '', licensePlate: '', year: null, odometerKm: 0, fuelTankLiters: '' }} describe={row => ({ title: String(row.name), detail: [row.year, row.licensePlate, `${Number(row.odometerKm).toLocaleString('he-IL')} ק״מ`,row.fuelTankLiters?`מכל ${row.fuelTankLiters} ליטר`:null].filter(Boolean).join(' · ') })}/>
      <RecordPanel kind="fuel" title="היסטוריית תדלוקים" action="הוספת תדלוק" records={fuel} disabled={!vehicles.length} fields={[{ key: 'vehicleId', label: 'רכב', options: vehicles.map(row => ({ value: row.id, label: String(row.name) })) }, dateField, numberField('estimatedRangeKm', 'טווח נסיעה משוער שמציג הרכב (ק״מ)', 100000,1), { ...numberField('actualDistanceKm', 'מרחק שבוצע בפועל (ק״מ)',100000), optional:true }, numberField('liters', 'כמות ליטרים בתדלוק', 10000, 0.01, '0.01'), {...numberField('pricePerLiter','מחיר הדלק מהאינטרנט',10000,0,'0.001'),hidden:true}]} defaults={{ vehicleId: vehicles[0]?.id ?? '', date: summary.today, estimatedRangeKm: '', actualDistanceKm: null, liters: '', pricePerLiter: fuelPrice?.price ?? 0 }} describe={row => ({ title: `${vehicleName(row.vehicleId)} · ${row.liters} ליטר`, detail: `${prettyDate(row.date)} · טווח משוער ${Number(row.estimatedRangeKm).toLocaleString('he-IL')} ק״מ${row.actualDistanceKm?` · בפועל ${Number(row.actualDistanceKm).toLocaleString('he-IL')} ק״מ`:''} · ${formatMoney(Number(row.liters) * Number(row.pricePerLiter))}` })}/>
      <RecordPanel kind="policies" title="ביטוחים" action="הוספת ביטוח" records={policies} disabled={!vehicles.length} fields={[{ key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'סוג הביטוח',options:[{value:'Mandatory',label:'חובה'},{value:'Comprehensive',label:'מקיף'},{value:'Third party',label:'צד ג׳'}]},{key:'provider',label:'חברת ביטוח',optional:true,max:100},numberField('annualCost','עלות שנתית',1000000),{key:'startDate',label:'תאריך התחלה',type:'date'},{key:'endDate',label:'תאריך סיום',type:'date'}]} defaults={{vehicleId:vehicles[0]?.id??'',type:'Mandatory',provider:'',annualCost:'',startDate:summary.today,endDate:summary.today}} describe={row=>({title:`${policyType(row.type)} · ${vehicleName(row.vehicleId)}`,detail:`${row.provider||'ללא חברה'} · ${formatMoney(Number(row.annualCost)/12)} לחודש · מסתיים ${prettyDate(row.endDate)}`})}/>
      <RecordPanel kind="reminders" title="טיפולים וטסט" action="הוספת תזכורת" records={reminders} disabled={!vehicles.length} fields={[{key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'סוג',options:[{value:'Maintenance',label:'טיפול'},{value:'Test',label:'טסט'}]},{key:'title',label:'כותרת',max:150},{key:'dueDate',label:'תאריך יעד',type:'date'},{...numberField('cost','עלות צפויה או בפועל',1000000),optional:true},{key:'notes',label:'הערות',optional:true,max:2000}]} defaults={{vehicleId:vehicles[0]?.id??'',type:'Maintenance',title:'',dueDate:summary.today,cost:null,notes:''}} describe={row=>({title:`${row.title} · ${vehicleName(row.vehicleId)}`,detail:`${reminderType(row.type)} · ${prettyDate(row.dueDate)}${row.cost?` · ${formatMoney(Number(row.cost))}`:''}`})}/>
      <RecordPanel kind="expenses" title="הוצאות רכב" action="הוספת הוצאה" records={expenses} disabled={!vehicles.length} fields={[{key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'סוג הוצאה',options:[{value:'Maintenance',label:'טיפול'},{value:'Repair',label:'תיקון'},{value:'Test',label:'טסט'},{value:'Other',label:'אחר'}]},{key:'title',label:'תיאור ההוצאה',max:150},numberField('amount','סכום',1000000),dateField,{key:'notes',label:'הערות',optional:true,max:2000}]} defaults={{vehicleId:vehicles[0]?.id??'',type:'Maintenance',title:'',amount:'',date:summary.today,notes:''}} describe={row=>({title:`${row.title} · ${vehicleName(row.vehicleId)}`,detail:`${prettyDate(row.date)} · ${formatMoney(Number(row.amount))}`})}/>
    </>}
    {module === 'nutrition' && <>
      <NutritionScanner today={summary.today} onProduct={setNutritionDraft}/>
      <RecordPanel kind="nutrition" title="מה אכלתי" action="הוספת מזון או ארוחה" records={nutrition} externalDraft={nutritionDraft} onDraftConsumed={()=>setNutritionDraft(null)} fields={[{ key: 'name', label: 'מה אכלת?', max: 200 }, {key:'meal',label:'',hidden:true}, dateField,numberField('quantity','כמות',10000,0.01,'0.01'),{key:'unit',label:'יחידה',max:30}, numberField('calories', 'קלוריות', 100000), numberField('proteinG', 'חלבון (גרם)', 10000, 0, '0.1'),numberField('carbsG','פחמימות (גרם)',10000,0,'0.1'),numberField('fatG','שומן (גרם)',10000,0,'0.1'),{key:'barcode',label:'',hidden:true}]} defaults={{ name: '', meal: 'Other', date: summary.today,quantity:1,unit:'מנה', calories: '', proteinG: '',carbsG:0,fatG:0,barcode:'' }} describe={row => ({ title: String(row.name), detail: `${prettyDate(row.date)} · ${row.quantity} ${row.unit} · ${row.calories} קלוריות · ${row.proteinG} גרם חלבון · ${row.carbsG} גרם פחמימות · ${row.fatG} גרם שומן` })}/>
      <Goals module="nutrition" summary={summary}/>
    </>}
  </div>;
}

