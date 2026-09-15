"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X, CarFront, Utensils, Bell, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import type { ModuleRecord, RecordKind } from '@/lib/modules';
import { NutritionScanner } from '@/components/nutrition-scanner';
import { WaterBottleIcon } from '@/components/water-bottle-icon';
import { expectedWaterAt, waterTimeMarks } from '@/lib/water-pacing';
import { IsraeliDatePicker } from '@/components/israeli-date-picker';
import { VehicleBrandLogo } from '@/components/vehicle-brand-logo';
import { FoodBank } from '@/components/food-bank';

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'license'; min?: number; max?: number; step?: string; optional?: boolean; hideOptional?: boolean; maxByVehicle?: Record<string,number>; hidden?: boolean; compact?:boolean; options?: { value: string; label: string }[] };
type Summary = { today: string; waterMl: number; calories: number; proteinG: number; fuelCost: number; waterGoalMl: number | null; calorieGoal: number | null; proteinGoalG: number | null; currency: string; age:number|null;sex:string|null;heightCm:number|null;weightKg:number|null;activityLevel:string|null;weightGoal:string|null;timezone:string;waterDayStart:string;waterDayEnd:string;waterPaceIntervalHours:number;waterReminderEnabled:boolean;waterReminderStart:string;waterReminderEnd:string;waterReminderIntervalMinutes:number;vehicleReminderEnabled:boolean };
const dateField: Field = { key: 'date', label: 'תאריך', type: 'date' };
const numberField = (key: string, label: string, max: number, min = 0, step = '1'): Field => ({ key, label, type: 'number', min, max, step });
const prettyDate = (value: unknown) => new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(String(value)));
const wholeHours=Array.from({length:24},(_,hour)=>`${String(hour).padStart(2,'0')}:00`);
const reminderTimes=Array.from({length:48},(_,index)=>`${String(Math.floor(index/2)).padStart(2,'0')}:${index%2?'30':'00'}`);
async function save(kind: string, data?: object, id?: string, remove = false) {
  const result = await fetch(`/api/modules/${kind}${id ? `/${id}` : ''}`, {
    method: remove ? 'DELETE' : id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined
  });
  const body = await result.json();
  if (!result.ok) throw new Error(body.error ?? 'לא ניתן לשמור. נסה שוב.');
}

function LicensePlateInput({value,year,month,onChange}:{value:string;year:number;month:number;onChange:(value:string)=>void}){
  const group=useRef<HTMLDivElement>(null);
  const modern=year>2017||(year===2017&&month>6),pattern=modern?'xxx-xx-xxx':'xx-xxx-xx',raw=String(value??'');
  const digits=raw.replace(/\D/g,'').split(''),formatted=raw.length===pattern.length?raw:pattern.replace(/x/g,()=>digits.shift()??'x');
  const slots=[...pattern].map((char,index)=>char==='x'?index:-1).filter(index=>index>=0);
  function focus(position:number){(group.current?.querySelector(`[data-plate-slot="${position}"]`) as HTMLInputElement|null)?.focus();}
  function update(position:number,digit:string){const chars=[...formatted];chars[position]=digit.replace(/\D/g,'').slice(-1)||'x';onChange(chars.join(''));if(chars[position]!=='x'){const next=slots[slots.indexOf(position)+1];if(next!==undefined)focus(next);}}
  return <div ref={group} className="license-plate-input" dir="ltr" aria-label="מספר לוחית רישוי רכב">{[...pattern].map((char,index)=>char==='-'?<span key={index}>-</span>:<input key={index} data-plate-slot={index} inputMode="numeric" pattern="[0-9]" maxLength={1} onFocus={event=>event.currentTarget.select()} onClick={event=>event.currentTarget.select()} aria-label={`ספרה ${slots.indexOf(index)+1} בלוחית הרישוי`} placeholder="x" value={/\d/.test(formatted[index]??'')?formatted[index]:''} onChange={event=>update(index,event.target.value)} onKeyDown={event=>{if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();if(event.currentTarget.value){update(index,'');}else if(event.key==='Backspace'){const previous=slots[slots.indexOf(index)-1];if(previous!==undefined){update(previous,'');focus(previous);}}}else if(/^\d$/.test(event.key)){event.preventDefault();update(index,event.key);}}}/> )}</div>;
}

type RecordDescription={title:string;detail?:string;status?:string;items?:{label:string;value:string}[]};
function RecordPanel({ kind, title, action, fields, records, defaults, describe, disabled = false, externalDraft, onDraftConsumed, confirmDeletion = true, hideAction = false, openSignal = 0, headerExtra, notice }: {
  kind: RecordKind; title: string; action: string; fields: Field[]; records: ModuleRecord[];
  defaults: Record<string, string | number | null>; describe: (record: ModuleRecord) => RecordDescription;
  disabled?: boolean;
  externalDraft?: Record<string,string|number|null> | null; onDraftConsumed?:()=>void;
  confirmDeletion?: boolean;
  hideAction?: boolean; openSignal?: number; headerExtra?:React.ReactNode; notice?:React.ReactNode;
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
  useEffect(()=>{if(openSignal>0)edit(null);},[openSignal]);
  function edit(record: ModuleRecord | null) {
    const recordValues:Record<string,string|number|null>={...defaults};
    if(record) for(const field of fields){const value=record[field.key];recordValues[field.key]=typeof value==='string'||typeof value==='number'||value===null?value:null;}
    setError(''); setEditing(record); setValues(recordValues); dialog.current?.showModal();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(fields.map(field => {
      const value = values[field.key];
      return [field.key, field.type === 'number' || ['roadMonth','reminderDays'].includes(field.key) ? (value === '' || value === null || value === undefined) && field.optional ? null : Number(value) : field.type==='date' && field.optional ? value || null : value ?? ''];
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
  const closeOnBackdrop=(event:React.MouseEvent<HTMLDialogElement>)=>{const box=event.currentTarget.getBoundingClientRect();if(event.target===event.currentTarget&&!busy&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))event.currentTarget.close();};
  return <section className={`journal-panel ${kind==='water'?'water-journal':''} ${kind==='vehicles'?'vehicles-panel':''} ${kind==='fuel'?'fuel-journal':''} ${kind==='policies'?'policies-panel':''}`}>
    <div className="section-heading"><div><h2>{title}</h2>{!['vehicles','expenses'].includes(kind)&&<p>רשומות אחרונות</p>}</div>
      {!hideAction&&<button className="button primary" disabled={disabled || !ready || busy} onClick={() => edit(null)}>{action}<Plus size={17}/></button>}
    </div>
    {headerExtra}{notice}{kind!=='vehicles'&&<p className="feedback" role="status">{message}</p>}
    {disabled && <p className="module-hint">יש להוסיף רכב כדי להתחיל לתעד תדלוקים.</p>}
    {visibleRecords.length === 0 ? <div className="journal-empty">עדיין אין רשומות. {disabled ? 'היסטוריית התדלוקים תופיע כאן.' : `אפשר לבחור „${action}” כדי להתחיל.`}</div> :
      <div className="journal-list">{visibleRecords.map(record => {
        const text = describe(record);
        return <article key={record.id} className="journal-row"><div><h3>{text.title}</h3>{text.items?<div className="record-detail-grid">{text.items.map(item=><span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>)}</div>:text.detail&&<p>{text.detail}</p>}</div>{text.status&&<span className={`record-status ${text.status==='פתוח'?'open':''}`}>{text.status}</span>}<div className="row-actions">
          <button className="icon-button" disabled={!ready || busy} aria-label={`עריכת ${text.title}`} onClick={() => edit(record)}><Pencil size={17}/></button>
          <button className="icon-button" disabled={!ready || busy} aria-label={`מחיקת ${text.title}`} onClick={() => {if(confirmDeletion){setRemoving(record);setError('');deletion.current?.showModal();}else void removeRecord(record);}}><Trash2 size={17}/></button>
        </div></article>;
      })}</div>}
    <dialog className={`modal record-modal ${kind==='fuel'?'fuel-entry-modal':''}`} ref={dialog} onClick={closeOnBackdrop} onCancel={event => { if (busy) event.preventDefault(); }}><form onSubmit={submit}>
      <div className="modal-heading"><h2>{editing ? `עריכת רשומה: ${title}` : action}</h2><button type="button" className="icon-button" disabled={busy} aria-label="סגירת הטופס" onClick={() => dialog.current?.close()}><X size={20}/></button></div>
      <div className="record-form-grid">{fields.filter(field=>!field.hidden).map(field => <label className={field.compact?'compact-field':''} key={field.key} htmlFor={`${kind}-${field.key}`}><span>{field.label}{field.optional && !field.hideOptional && <span className="optional"> (לא חובה)</span>}</span>
        {field.options ? <select id={`${kind}-${field.key}`} required={!field.optional} value={String(values[field.key] ?? '')} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> :
          field.type==='license'?<LicensePlateInput value={String(values[field.key]??'')} year={Number(values.year)} month={Number(values.roadMonth)} onChange={value=>setValues({...values,[field.key]:value})}/>:field.type==='date'?<IsraeliDatePicker required={!field.optional} label={field.label} value={String(values[field.key]??'')||null} onChange={value=>setValues({...values,[field.key]:value})}/>:<input id={`${kind}-${field.key}`} type={field.type ?? 'text'} inputMode={field.type==='number'?(field.step&&field.step!=='1'?'decimal':'numeric'):undefined} required={!field.optional} min={field.min} max={field.maxByVehicle?.[String(values.vehicleId)]??field.max} maxLength={field.type === undefined || field.type === 'text' ? field.max ?? 200 : undefined} step={field.step} value={values[field.key] ?? ''} onChange={event => setValues({ ...values, [field.key]: event.target.value })}/>}
      </label>)}</div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>ביטול</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'שומר…' : 'שמירת רשומה'}</button></div>
    </form></dialog>
    <dialog className="modal small-modal" ref={deletion} onClick={closeOnBackdrop} onCancel={event => { if (busy) event.preventDefault(); }}>
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
  const activityFactors:Record<string,number>={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
  const canCalculate=summary.age&&summary.sex&&summary.heightCm&&summary.weightKg&&summary.activityLevel&&summary.weightGoal;
  const bmr=canCalculate?Math.round(10*summary.weightKg!+6.25*summary.heightCm!-5*summary.age!+(summary.sex==='male'?5:-161)):null;
  const tdee=bmr?Math.round(bmr*activityFactors[summary.activityLevel!]):null;
  const recommendedCalories=tdee?tdee+(summary.weightGoal==='lose'?-500:summary.weightGoal==='gain'?300:0):null;
  const recommendedProtein=summary.weightKg?Math.round(summary.weightKg*(summary.weightGoal==='gain'?1.8:1.6)):null;
  const fields = module === 'water' ? [{ key: 'waterGoalMl', label: 'יעד מים יומי (מ״ל)', value: summary.waterGoalMl, max: 20000 }] :
    [{ key: 'calorieGoal', label: 'יעד קלוריות יומי', value: summary.calorieGoal??recommendedCalories, max: 20000 }, { key: 'proteinGoalG', label: 'יעד חלבון יומי (גרם)', value: summary.proteinGoalG??recommendedProtein, max: 2000 }];
  return <section className={`goals-panel ${module==='nutrition'?'nutrition-goals':''}`}><h2>{module==='water'?'היעד היומי שלך':'יעדי תזונה'}</h2>{module==='nutrition'&&<div className="metabolism-cards"><div><small>BMR</small><strong>{bmr?.toLocaleString('he-IL')??'—'}</strong><span>קלוריות במנוחה</span></div><div><small>TDEE</small><strong>{tdee?.toLocaleString('he-IL')??'—'}</strong><span>הוצאה יומית משוערת</span></div></div>}<form onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const data:Record<string,string|number|null>=Object.fromEntries(fields.map(field => [field.key, form.get(field.key) ? Number(form.get(field.key)) : null]));
    if(module==='water'){data.waterDayStart=String(form.get('waterDayStart'));data.waterDayEnd=String(form.get('waterDayEnd'));data.waterPaceIntervalHours=Number(form.get('waterPaceIntervalHours'));}
    if(module==='nutrition'){
      data.age=form.get('age')?Number(form.get('age')):null;data.sex=String(form.get('sex')||'')||null;data.heightCm=form.get('heightCm')?Number(form.get('heightCm')):null;data.weightKg=form.get('weightKg')?Number(form.get('weightKg')):null;data.activityLevel=String(form.get('activityLevel')||'')||null;data.weightGoal=String(form.get('weightGoal')||'')||null;
      if(event.nativeEvent instanceof SubmitEvent && (event.nativeEvent.submitter as HTMLButtonElement)?.value==='calculate'&&data.age&&data.sex&&data.heightCm&&data.weightKg&&data.activityLevel&&data.weightGoal){const base=Math.round(10*Number(data.weightKg)+6.25*Number(data.heightCm)-5*Number(data.age)+(data.sex==='male'?5:-161));const expenditure=Math.round(base*activityFactors[String(data.activityLevel)]);data.calorieGoal=expenditure+(data.weightGoal==='lose'?-500:data.weightGoal==='gain'?300:0);data.proteinGoalG=Math.round(Number(data.weightKg)*(data.weightGoal==='gain'?1.8:1.6));}
    }
    try { await save('goals', data); setMessage('היעדים נשמרו.'); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן לשמור.'); } finally { setBusy(false); }
  }}>{module==='nutrition'&&<><label>גיל<input name="age" type="number" min="13" max="120" defaultValue={summary.age??''}/></label><label>מין לחישוב<select name="sex" defaultValue={summary.sex??''}><option value="">בחירה</option><option value="male">זכר</option><option value="female">נקבה</option></select></label><label>גובה (ס״מ)<input name="heightCm" type="number" min="100" max="250" defaultValue={summary.heightCm??''}/></label><label>משקל (ק״ג)<input name="weightKg" type="number" min="30" max="400" step="0.1" defaultValue={summary.weightKg??''}/></label><label>רמת פעילות<select name="activityLevel" defaultValue={summary.activityLevel??''}><option value="">בחירה</option><option value="sedentary">מעטה</option><option value="light">קלה</option><option value="moderate">בינונית</option><option value="active">גבוהה</option><option value="very_active">גבוהה מאוד</option></select></label><label>מטרה<select name="weightGoal" defaultValue={summary.weightGoal??''}><option value="">בחירה</option><option value="lose">ירידה במשקל</option><option value="maintain">שמירה על המשקל</option><option value="gain">עלייה במשקל / מסה</option></select></label></>}{fields.map(field => <label key={field.key}>{field.label}<input name={field.key} type="number" min={1} max={field.max} step="1" defaultValue={field.value ?? ''}/></label>)}{module==='water'&&<div className="water-goal-schedule"><label>שעת התחלה<select name="waterDayStart" defaultValue={summary.waterDayStart}>{wholeHours.slice(0,-1).map(time=><option key={time}>{time}</option>)}</select></label><label>שעת סיום<select name="waterDayEnd" defaultValue={summary.waterDayEnd}>{wholeHours.slice(1).map(time=><option key={time}>{time}</option>)}</select></label><label>מרווח שעות<select name="waterPaceIntervalHours" defaultValue={summary.waterPaceIntervalHours}><option value="2">כל שעתיים</option><option value="4">כל ארבע שעות</option></select></label></div>}
    <div className="goal-actions">{module==='nutrition'&&<button className="button primary" name="action" value="calculate" disabled={busy||!ready}>חישוב אוטומטי ושמירה</button>}<button className="button secondary" disabled={busy || !ready}>{busy ? 'שומר…' : 'שמירת שינויים ידנית'}</button></div>
  </form>{error && <p className="error-text" role="alert">{error}</p>}<p className="feedback" role="status">{message}</p></section>;
}

function sundayWeek(value:Date){const start=new Date(Date.UTC(value.getUTCFullYear(),0,1));start.setUTCDate(start.getUTCDate()-start.getUTCDay());return Math.floor((value.getTime()-start.getTime())/(7*86400000))+1;}

function WaterDashboard({amount,goal,records,today,startTime,endTime,intervalHours,timeZone}:{amount:number;goal:number|null;records:ModuleRecord[];today:string;startTime:string;endTime:string;intervalHours:number;timeZone:string}){
  const [weekOffset,setWeekOffset]=useState(0);
  const [clock,setClock]=useState<Date|null>(null);
  useEffect(()=>{setClock(new Date());const timer=window.setInterval(()=>setClock(new Date()),60000);return()=>window.clearInterval(timer);},[]);
  const percent=goal?Math.round(amount/goal*100):0,fill=Math.min(100,Math.max(0,percent));
  const todayDate=new Date(`${today}T00:00:00Z`);
  const weekStart=new Date(todayDate);weekStart.setUTCDate(weekStart.getUTCDate()-weekStart.getUTCDay()+weekOffset*7);
  const days=Array.from({length:7},(_,index)=>{const date=new Date(weekStart);date.setUTCDate(date.getUTCDate()+index);const key=date.toISOString().slice(0,10),recorded=records.filter(record=>String(record.date)===key).reduce((sum,record)=>sum+Number(record.amountMl),0),total=key===today?amount:recorded,shortDate=`${String(date.getUTCDate()).padStart(2,'0')}/${String(date.getUTCMonth()+1).padStart(2,'0')}`;return {key,total,label:new Intl.DateTimeFormat('he-IL',{weekday:'narrow',timeZone:'UTC'}).format(date),shortDate};});
  const weekNumber=sundayWeek(weekStart),weekTotal=days.reduce((sum,day)=>sum+day.total,0);
  const timeMarks=waterTimeMarks(startTime,endTime,intervalHours===4?4:2);
  let currentMinute:number|null=null;if(clock){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(clock).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));currentMinute=Number(parts.hour)*60+Number(parts.minute);}
  const expectedNow=goal&&currentMinute!==null?expectedWaterAt(goal,currentMinute,startTime,endTime):0;
  return <section className="water-dashboard-card">
    <div className="hydration-vessel" role="progressbar" aria-label="התקדמות בצריכת המים היומית" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill}>
      <div className="hydration-water" style={{height:`${fill}%`}}><i/><i/><i/></div>
      <div className="hydration-reading"><strong>{amount.toLocaleString('he-IL')}</strong><span>מתוך {goal?.toLocaleString('he-IL')??'—'} מ״ל</span><b>{percent}%</b></div>
    </div>
    <div className="water-week"><div className="water-week-heading"><button type="button" aria-label="השבוע הקודם" onClick={()=>setWeekOffset(value=>value-1)}><ChevronRight/></button><div><span>צריכת מים לשבוע {weekNumber}</span><strong>{weekTotal.toLocaleString('he-IL')} מ״ל</strong></div><button type="button" aria-label="השבוע הבא" disabled={weekOffset===0} onClick={()=>setWeekOffset(value=>Math.min(0,value+1))}><ChevronLeft/></button></div><div className="water-week-bars">{days.map(day=>{const dayPercent=goal?Math.min(100,day.total/goal*100):0,isToday=day.key===today,isLate=isToday&&weekOffset===0&&Boolean(expectedNow&&day.total<expectedNow);return <div className={`${isToday?'today':''} ${isLate?'late':''}`} key={day.key}><span className="water-day-pill"><i style={{height:`${dayPercent}%`}}/><span className="water-time-scale">{timeMarks.map((minute,index)=><b key={minute} style={{bottom:`${timeMarks.length===1?0:index/(timeMarks.length-1)*100}%`}}>{String(Math.floor(minute/60)).padStart(2,'0')}</b>)}</span></span><small><span>{day.label}</span><time dateTime={day.key}>{day.shortDate}</time></small><b className="water-day-total">{day.total.toLocaleString('he-IL')} מ״ל</b></div>})}</div></div>
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
  useEffect(()=>{setEnabled(summary.waterReminderEnabled);setStart(summary.waterReminderStart);setEnd(summary.waterReminderEnd);setInterval(summary.waterReminderIntervalMinutes);},[summary.waterReminderEnabled,summary.waterReminderStart,summary.waterReminderEnd,summary.waterReminderIntervalMinutes]);
  useEffect(()=>{let active=true;(async()=>{if(!('serviceWorker' in navigator)||!('PushManager' in window))return;const registration=await navigator.serviceWorker.ready;const subscription=await registration.pushManager.getSubscription();if(active)setDeviceReady(Boolean(subscription)&&Notification.permission==='granted');})().catch(()=>{});return()=>{active=false;};},[]);
  async function enableDevice(){if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('הדפדפן הזה אינו תומך בהתראות Push.');const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('לא ניתנה הרשאה להתראות.');const registration=await navigator.serviceWorker.ready,existing=await registration.pushManager.getSubscription(),config=await fetch('/api/push/subscriptions').then(response=>response.json());if(!config.publicKey)throw new Error('שירות ההתראות עדיין לא הוגדר בשרת.');const subscription=existing??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});const response=await fetch('/api/push/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription.toJSON())});if(!response.ok)throw new Error('לא ניתן לשמור את המכשיר להתראות.');setDeviceReady(true);}
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage('');setError('');try{if(enabled&&!deviceReady)await enableDevice();await save('water-reminders',{enabled,startTime:start,endTime:end,intervalMinutes:interval});setMessage(enabled?'תזכורות השתייה נשמרו ויישלחו גם כשהאתר סגור.':'תזכורות השתייה כובו.');}catch(e){setError(e instanceof Error?e.message:'לא ניתן לשמור את התזכורות.');}finally{setBusy(false);}}
  async function toggle(next:boolean){setEnabled(next);setBusy(true);setMessage('');setError('');try{if(next&&!deviceReady)await enableDevice();await save('water-reminders',{enabled:next,startTime:start,endTime:end,intervalMinutes:interval});setMessage(next?'התזכורות הופעלו ונשמרו.':'התזכורות כובו.');}catch(e){setEnabled(!next);setError(e instanceof Error?e.message:'לא ניתן לשנות את ההתראות.');}finally{setBusy(false);}}
  async function activateDevice(){setBusy(true);setMessage('');setError('');try{await enableDevice();setMessage('המכשיר מחובר להתראות.');}catch(e){setError(e instanceof Error?e.message:'לא ניתן להפעיל התראות במכשיר הזה.');}finally{setBusy(false);}}
  const startChoices=reminderTimes.includes(start)?reminderTimes:[start,...reminderTimes],endChoices=reminderTimes.includes(end)?reminderTimes:[end,...reminderTimes];
  return <section className="water-reminders"><div className="water-reminder-title"><span><Bell/></span><div><h2>תזכורות שתייה</h2><p>בחירת שעות קבועות שבהן SBO יזכיר לך לשתות.</p></div></div><form onSubmit={submit}><label className="water-reminder-toggle"><span>תזכורות פעילות</span><input type="checkbox" checked={enabled} disabled={busy} onChange={event=>void toggle(event.target.checked)}/><i aria-hidden="true"/></label><div className="water-reminder-grid"><label>שעת התחלה<select required value={start} onChange={event=>setStart(event.target.value)}>{startChoices.map(time=><option key={time}>{time}</option>)}</select></label><label>שעת סיום<select required value={end} onChange={event=>setEnd(event.target.value)}>{endChoices.map(time=><option key={time}>{time}</option>)}</select></label><label>תדירות<select value={interval} onChange={event=>setInterval(Number(event.target.value))}><option value={30}>כל חצי שעה</option><option value={60}>כל שעה</option><option value={90}>כל שעה וחצי</option><option value={120}>כל שעתיים</option><option value={180}>כל 3 שעות</option><option value={240}>כל 4 שעות</option></select></label></div><button className="button primary" disabled={busy}>{busy?'שומר…':'שמירת שעות'}</button></form>{enabled&&!deviceReady&&<div className="water-device-setup"><p className="module-hint">באייפון ובאייפד יש להוסיף את SBO למסך הבית ולפתוח אותו משם פעם אחת.</p><button type="button" className="button secondary" disabled={busy} onClick={()=>void activateDevice()}>הפעלת התראות במכשיר הזה</button></div>}{message&&<p className="feedback" role="status">{message}</p>}{error&&<p className="error-text" role="alert">{error}</p>}</section>;
}

type FuelPrice={average:number;stations:{name:string;price:number;sourceUrl:string}[];checkedAt:string;online:boolean};
function FuelPriceCard({data,format}:{data:FuelPrice|null;format:(value:number)=>string}){
  const dialog=useRef<HTMLDialogElement>(null);
  return <><button type="button" className="fuel-price-card" onClick={()=>dialog.current?.showModal()}><small>מחיר ממוצע לליטר · בנזין 95 בשירות עצמי</small><strong>{format(data?.average??0)} <span>לליטר</span></strong><em>הצגת המחיר בכל תחנה</em></button><dialog ref={dialog} className="modal fuel-price-modal" onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}}><div className="modal-heading"><div><span className="eyebrow">מחיר רשמי לליטר · שירות עצמי</span><h2>מחירי בנזין 95</h2></div><button className="icon-button" aria-label="סגירה" onClick={()=>dialog.current?.close()}><X/></button></div><div className="station-prices">{data?.stations.map(station=><a href={station.sourceUrl} target="_blank" rel="noreferrer" key={station.name}><span>{station.name}</span><strong>{format(station.price)} לליטר</strong></a>)}</div><p className="module-hint">מחיר בנזין 95 בשירות עצמי מפוקח ולכן עשוי להיות זהה בין הרשתות. המחיר אינו כולל הנחות, מבצעים או מועדוני לקוחות.</p><small className="price-updated">עודכן: {data?prettyDate(data.checkedAt):'לא זמין'}</small></dialog></>;
}

function CarNotifications({summary}:{summary:Summary}){
  const [enabled,setEnabled]=useState(summary.vehicleReminderEnabled),[deviceReady,setDeviceReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  useEffect(()=>setEnabled(summary.vehicleReminderEnabled),[summary.vehicleReminderEnabled]);
  useEffect(()=>{let active=true;(async()=>{if(!('serviceWorker'in navigator)||!('PushManager'in window))return;const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();if(active)setDeviceReady(Boolean(subscription)&&Notification.permission==='granted');})().catch(()=>{});return()=>{active=false;};},[]);
  async function enableDevice(){if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('הדפדפן הזה אינו תומך בהתראות Push.');const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('לא ניתנה הרשאה להתראות.');const registration=await navigator.serviceWorker.ready,existing=await registration.pushManager.getSubscription(),config=await fetch('/api/push/subscriptions').then(response=>response.json());const subscription=existing??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});const response=await fetch('/api/push/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription.toJSON())});if(!response.ok)throw new Error('לא ניתן לשמור את המכשיר להתראות.');setDeviceReady(true);}
  async function toggle(next:boolean){setEnabled(next);setBusy(true);setMessage('');setError('');try{if(next&&!deviceReady)await enableDevice();await save('vehicle-reminders',{enabled:next});setMessage(next?'התראות הרכב הופעלו ונשמרו.':'התראות הרכב כובו.');}catch(e){setEnabled(!next);setError(e instanceof Error?e.message:'לא ניתן לשנות את ההתראות.');}finally{setBusy(false);}}
  return <section className="car-notifications"><div><ShieldCheck/><span><strong>התראות תחזוקת רכב</strong><small>התראות לביטוחים, טסטים וטיפולים יישלחו גם כשהאתר סגור</small></span></div><label className="water-reminder-toggle"><span>{enabled?'פעילות':'כבויות'}</span><input type="checkbox" checked={enabled} disabled={busy} onChange={event=>void toggle(event.target.checked)}/><i/></label>{enabled&&!deviceReady&&<button className="button secondary" disabled={busy} onClick={()=>void enableDevice().catch(e=>setError(e instanceof Error?e.message:'לא ניתן להפעיל התראות.'))}>הפעלת התראות במכשיר הזה</button>}{message&&<p className="feedback">{message}</p>}{error&&<p className="error-text">{error}</p>}</section>;
}

function MonthlyCostChart({fuel,policies,reminders,expenses,currency}:{fuel:ModuleRecord[];policies:ModuleRecord[];reminders:ModuleRecord[];expenses:ModuleRecord[];currency:string}){
  const format=new Intl.NumberFormat('he-IL',{style:'currency',currency,maximumFractionDigits:0});
  const now=new Date(), months=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));return {key:d.toISOString().slice(0,7),label:new Intl.DateTimeFormat('he-IL',{month:'short',timeZone:'UTC'}).format(d),fuel:0,insurance:0,maintenance:0,other:0};});
  for(const row of fuel){const month=months.find(m=>m.key===String(row.date).slice(0,7));if(month)month.fuel+=Number(row.liters)*Number(row.pricePerLiter);}
  for(const row of policies){for(const month of months){if(month.key>=String(row.startDate).slice(0,7)&&month.key<=String(row.endDate).slice(0,7))month.insurance+=Number(row.annualCost)/12;}}
  for(const row of reminders){const month=months.find(m=>m.key===String(row.dueDate).slice(0,7));if(month)month.maintenance+=Number(row.licenseFee||0)+Number(row.testFee||0);}
  for(const row of expenses){const month=months.find(m=>m.key===String(row.date).slice(0,7));if(month){if(row.type==='Maintenance'||row.type==='Repair'||row.type==='Test')month.maintenance+=Number(row.amount);else month.other+=Number(row.amount);}}
  const max=Math.max(1,...months.map(m=>m.fuel+m.insurance+m.maintenance+m.other));
  return <section className="cost-chart"><div className="section-heading"><div><h2>עלויות לפי חודשים</h2><p>דלק, ביטוח, טיפולים והוצאות נוספות</p></div></div><div className="chart-legend"><span className="fuel">דלק</span><span className="insurance">ביטוח</span><span className="maintenance">טיפולים ותיקונים</span><span className="other">אחר</span></div><div className="bars">{months.map(month=>{const total=month.fuel+month.insurance+month.maintenance+month.other;return <div className="bar-column" key={month.key}><small>{total?format.format(total):'—'}</small><div className="bar" style={{height:`${Math.max(4,total/max*180)}px`}}>{(['fuel','insurance','maintenance','other'] as const).map(type=><span key={type} className={type} style={{height:`${total?month[type]/total*100:0}%`}} title={`${type}: ${format.format(month[type])}`}/>)}</div><strong>{month.label}</strong></div>})}</div></section>;
}

export function ModuleWorkspace({ module, summary, water, vehicles, fuel, nutrition, policies, reminders, expenses, fuelPrice }: { module: 'water' | 'car' | 'nutrition'; summary: Summary; water: ModuleRecord[]; vehicles: ModuleRecord[]; fuel: ModuleRecord[]; nutrition: ModuleRecord[]; policies: ModuleRecord[]; reminders: ModuleRecord[]; expenses:ModuleRecord[]; fuelPrice: FuelPrice | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [displayWaterMl,setDisplayWaterMl]=useState(summary.waterMl);
  const [manualWaterSignal,setManualWaterSignal]=useState(0);
  const [nutritionDraft,setNutritionDraft]=useState<Record<string,string|number|null>|null>(null);
  const [waterHistoryDate,setWaterHistoryDate]=useState(summary.today);
  useEffect(() => { setReady(true); const refresh = () => router.refresh(); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [router]);
  useEffect(()=>setDisplayWaterMl(summary.waterMl),[summary.waterMl]);
  useEffect(()=>setWaterHistoryDate(summary.today),[summary.today]);
  const title = { water: 'צריכת מים יומית', car: 'רכב', nutrition: 'תזונה' }[module];
  const Icon = { water: WaterBottleIcon, car: CarFront, nutrition: Utensils }[module];
  const formatMoney = (value: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: summary.currency }).format(value);
  const vehicleName = (id: unknown) => String(vehicles.find(vehicle => vehicle.id === id)?.name ?? 'רכב');
  const policyType = (value: unknown) => ({ Mandatory: 'חובה', Comprehensive: 'מקיף', 'Third party': 'צד ג׳' }[String(value)] ?? String(value));
  const upcoming = reminders.filter(row=>String(row.expiryDate??row.dueDate)>=summary.today&&String(row.expiryDate??row.dueDate)<=new Date(new Date(`${summary.today}T00:00:00Z`).getTime()+30*86400000).toISOString().slice(0,10));
  const insuranceIncomplete=vehicles.some(vehicle=>{const types=new Set(policies.filter(policy=>policy.vehicleId===vehicle.id).map(policy=>String(policy.type)));return !types.has('Mandatory')||!types.has('Third party');});
  const waterWeekStart=new Date(`${summary.today}T00:00:00Z`);waterWeekStart.setUTCDate(waterWeekStart.getUTCDate()-waterWeekStart.getUTCDay());
  const waterHistoryDays=Array.from({length:7},(_,index)=>{const date=new Date(waterWeekStart);date.setUTCDate(date.getUTCDate()+index);return {key:date.toISOString().slice(0,10),label:['א','ב','ג','ד','ה','ו','ש'][index]};});
  return <div className={`module-workspace ${module}-workspace`}>
    <div className="topline"><span>סביבת עבודה <span className="crumb">/</span><strong>{title}</strong></span><span>{prettyDate(summary.today)}</span></div>
    <header className={`page-heading ${module==='water'?'water-page-heading':''}`}><div><h1>{title}</h1></div><span className={`module-icon ${module}-card`}><Icon/></span></header>
    <section className="module-stats" aria-label={`סיכום ${title}`}>
      {module === 'water' && <><div><small>צריכת מים יומית</small><strong>{displayWaterMl.toLocaleString('he-IL')} <span>מ״ל</span></strong></div><div><small>יעד יומי</small><strong>{summary.waterGoalMl?.toLocaleString('he-IL') ?? 'לא הוגדר'} <span>{summary.waterGoalMl ? 'מ״ל' : ''}</span></strong></div><div><small>התקדמות</small><strong>{summary.waterGoalMl ? `${Math.round(displayWaterMl / summary.waterGoalMl * 100)}%` : '—'}</strong></div></>}
      {module === 'car' && <><FuelPriceCard data={fuelPrice} format={formatMoney}/><div><small>עלות הדלק החודש</small><strong>{formatMoney(summary.fuelCost)}</strong></div><div className="car-vehicle-stat"><VehicleBrandLogo name={String(vehicles[0]?.name??'')}/><small>פרטי הרכב</small><strong className="vehicle-summary">{vehicles[0]?.name||'טרם הוגדר רכב'}</strong><small>{vehicles[0]?[vehicles[0].year&&vehicles[0].roadMonth?`${String(vehicles[0].roadMonth).padStart(2,'0')}/${vehicles[0].year}`:null,vehicles[0].licensePlate].filter(Boolean).join(' · '):'הוספת רכב תציג כאן את פרטיו'}</small></div><CarNotifications summary={summary}/></>}
      {module === 'nutrition' && <><div><small>קלוריות היום</small><strong>{summary.calories.toLocaleString('he-IL')} <span>קלוריות</span></strong><small>{summary.calorieGoal ? `יעד: ${summary.calorieGoal.toLocaleString('he-IL')}` : 'לא הוגדר יעד'}</small></div><div><small>חלבון היום</small><strong>{summary.proteinG.toLocaleString('he-IL')} <span>גרם</span></strong><small>{summary.proteinGoalG ? `יעד: ${summary.proteinGoalG.toLocaleString('he-IL')} גרם` : 'לא הוגדר יעד'}</small></div></>}
    </section>
    {module === 'water' && <>
      <WaterDashboard amount={displayWaterMl} goal={summary.waterGoalMl} records={water} today={summary.today} startTime={summary.waterDayStart} endTime={summary.waterDayEnd} intervalHours={summary.waterPaceIntervalHours} timeZone={summary.timezone}/>
      <div className="quick-water"><h2>הוספת שתייה מהירה</h2><div>{[250, 500, 750, 1000].map(amount => <button key={amount} className="button secondary water-quick-button" disabled={busy || !ready} onClick={async () => {
        setBusy(true); setError(''); setMessage(''); setDisplayWaterMl(current=>current+amount);
        try { await save('water', { amountMl: amount, date: summary.today }); setMessage(`נוספו ${amount} מ״ל.`); router.refresh(); }
        catch (e) { setDisplayWaterMl(current=>Math.max(0,current-amount));setError(e instanceof Error ? e.message : 'לא ניתן לשמור.'); } finally { setBusy(false); }
      }}><WaterServingIcon amount={amount}/><span>{amount} מ״ל</span></button>)}<button className="button secondary manual-water-button" onClick={()=>setManualWaterSignal(value=>value+1)}><Plus/><span>הוספת שתייה ידנית</span></button></div><p role="status" className="feedback">{message}</p>{error && <p role="alert" className="error-text">{error}</p>}</div>
      <div className="water-secondary-grid"><WaterReminders summary={summary}/>
      <RecordPanel kind="water" title="היסטוריית שתייה" action="הוספת מים" fields={[numberField('amountMl', 'כמות (מ״ל)', 10000, 1), dateField]} records={water.filter(row=>String(row.date)===waterHistoryDate)} defaults={{ amountMl: 250, date: summary.today }} confirmDeletion={false} hideAction openSignal={manualWaterSignal} headerExtra={<div className="water-history-days" aria-label="בחירת יום בהיסטוריית השתייה">{waterHistoryDays.map(day=><button type="button" className={waterHistoryDate===day.key?'selected':''} aria-pressed={waterHistoryDate===day.key} onClick={()=>setWaterHistoryDate(day.key)} key={day.key}>{day.label}</button>)}</div>} describe={row => ({ title: `${row.amountMl} מ״ל`, detail: prettyDate(row.date) })}/></div>
      <Goals module="water" summary={summary}/>
    </>}
    {module === 'car' && <>
      <RecordPanel kind="vehicles" title="רכבים" action="הוספת רכב" records={vehicles} fields={[{key:'name',label:'סוג הרכב',max:100},{...numberField('year','שנת עלייה לכביש',2100,1900),compact:true},{key:'roadMonth',label:'חודש עלייה לכביש',type:'number',options:Array.from({length:12},(_,index)=>({value:String(index+1),label:String(index+1).padStart(2,'0')})),compact:true},{key:'licensePlate',label:'מספר לוחית רישוי רכב',type:'license'},{...numberField('odometerKm','קילומטראז׳ נוכחי',10000000),compact:true},{...numberField('fuelTankLiters','נפח מכל הדלק (ליטר)',1000,1,'0.1'),compact:true}]} defaults={{name:'',licensePlate:'',year:new Date().getFullYear(),roadMonth:new Date().getMonth()+1,odometerKm:0,fuelTankLiters:''}} describe={row=>({title:String(row.name),items:[{label:'עלייה לכביש',value:row.year&&row.roadMonth?`${String(row.roadMonth).padStart(2,'0')}/${row.year}`:String(row.year??'לא הוזן')},{label:'לוחית רישוי',value:String(row.licensePlate)},{label:'קילומטראז׳',value:`${Number(row.odometerKm).toLocaleString('he-IL')} ק״מ`},{label:'נפח מכל',value:row.fuelTankLiters?`${row.fuelTankLiters} ליטר`:'לא הוזן'},{label:'ביטוח חובה',value:(()=>{const p=policies.find(p=>p.vehicleId===row.id&&p.type==='Mandatory');return p?prettyDate(p.endDate):'לא הוזן תוקף';})()},{label:'ביטוח צד ג׳',value:(()=>{const p=policies.find(p=>p.vehicleId===row.id&&p.type==='Third party');return p?prettyDate(p.endDate):'לא הוזן תוקף';})()},{label:'ביטוח מקיף',value:(()=>{const p=policies.find(p=>p.vehicleId===row.id&&p.type==='Comprehensive');return p?prettyDate(p.endDate):'לא הוזן תוקף';})()},{label:'תוקף טסט',value:(()=>{const test=reminders.filter(r=>r.vehicleId===row.id&&r.type==='Test').sort((a,b)=>String(b.expiryDate).localeCompare(String(a.expiryDate)))[0];return test?prettyDate(test.expiryDate):'לא הוזן';})()}]})}/>

      {upcoming.length>0&&<section className="alerts-panel"><h2>אירועים ב־30 הימים הקרובים</h2>{upcoming.map(row=><p key={row.id}><strong>{row.title}</strong> · {vehicleName(row.vehicleId)} · {prettyDate(row.expiryDate??row.dueDate)}</p>)}</section>}
      <RecordPanel kind="fuel" title="היסטוריית תדלוקים" action="הוספת תדלוק" records={fuel} disabled={!vehicles.length} fields={[{key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)})),compact:true},{...dateField,compact:true},{...numberField('estimatedRangeKm','טווח נסיעה משוער (ק״מ)',100000,1),compact:true},{...numberField('actualDistanceKm','מרחק בפועל (ק״מ)',100000),optional:true,hideOptional:true,compact:true},{...numberField('liters','ליטר שתודלק',10000,0.01,'0.01'),maxByVehicle:Object.fromEntries(vehicles.map(v=>[v.id,Number(v.fuelTankLiters)||10000])),compact:true},{...numberField('pricePerLiter','מחיר הדלק מהאינטרנט',10000,0,'0.001'),hidden:true}]} defaults={{vehicleId:vehicles[0]?.id??'',date:summary.today,estimatedRangeKm:'',actualDistanceKm:null,liters:'',pricePerLiter:fuelPrice?.average??0}} describe={row=>({title:`${vehicleName(row.vehicleId)} · ${row.liters}L`,detail:`${prettyDate(row.date)} · טווח משוער ${Number(row.estimatedRangeKm).toLocaleString('he-IL')} ק״מ${row.actualDistanceKm?` · בפועל ${Number(row.actualDistanceKm).toLocaleString('he-IL')} ק״מ`:''} · ${formatMoney(Number(row.liters)*Number(row.pricePerLiter))}`,status:row.actualDistanceKm?'נסגר':'פתוח'})}/>
      <RecordPanel kind="reminders" title="טסט" action="הוספת טסט" records={reminders.filter(row=>row.type==='Test')} disabled={!vehicles.length} fields={[{key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'',hidden:true},{key:'title',label:'',hidden:true},{key:'dueDate',label:'תאריך ביצוע הטסט',type:'date'},{key:'expiryDate',label:'תאריך גמר הטסט החדש',type:'date'},{...numberField('licenseFee','אגרת טסט',1000000),compact:true},{...numberField('testFee','עלות הטסט',1000000),compact:true},{...numberField('cost','',1000000),hidden:true,optional:true},{key:'reminderDays',label:'התראה לפני גמר הטסט',type:'number',optional:true,options:[{value:'',label:'ללא התראה'},{value:'0',label:'ביום סיום הטסט'},{value:'7',label:'שבוע לפני'},{value:'30',label:'חודש לפני'}]},{key:'reminderTime',label:'שעת ההתראה',options:reminderTimes.map(value=>({value,label:value}))},{key:'notes',label:'הערות',optional:true,max:2000}]} defaults={{vehicleId:vehicles[0]?.id??'',type:'Test',title:'טסט',dueDate:summary.today,expiryDate:summary.today,licenseFee:'',testFee:'',cost:null,reminderDays:null,reminderTime:'09:00',notes:''}} describe={row=>({title:`טסט · ${vehicleName(row.vehicleId)}`,detail:`בוצע ${prettyDate(row.dueDate)} · בתוקף עד ${prettyDate(row.expiryDate)} · אגרה ${formatMoney(Number(row.licenseFee))} · טסט ${formatMoney(Number(row.testFee))}`})}/>
      <RecordPanel kind="policies" title="ביטוחים" action="הוספת ביטוח" records={policies} disabled={!vehicles.length} notice={insuranceIncomplete?<p className="module-hint insurance-requirement">לכל רכב יש להגדיר לפחות ביטוח חובה וביטוח צד ג׳. ניתן להוסיף גם ביטוח מקיף, עד שלושה ביטוחים לרכב.</p>:null} fields={[{key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'סוג הביטוח',options:[{value:'Mandatory',label:'חובה'},{value:'Comprehensive',label:'מקיף'},{value:'Third party',label:'צד ג׳'}]},{key:'provider',label:'חברת ביטוח',optional:true,max:100},numberField('annualCost','עלות שנתית',1000000),{key:'startDate',label:'תאריך התחלה',type:'date'},{key:'endDate',label:'תאריך סיום',type:'date'},{key:'reminderDays',label:'התראה לפני גמר הביטוח',type:'number',optional:true,options:[{value:'',label:'ללא התראה'},{value:'0',label:'ביום סיום הביטוח'},{value:'7',label:'שבוע לפני'},{value:'30',label:'חודש לפני'}]},{key:'reminderTime',label:'שעת ההתראה',options:reminderTimes.map(value=>({value,label:value}))}]} defaults={{vehicleId:vehicles[0]?.id??'',type:'Mandatory',provider:'',annualCost:'',startDate:summary.today,endDate:summary.today,reminderDays:null,reminderTime:'09:00'}} describe={row=>({title:`${policyType(row.type)} · ${vehicleName(row.vehicleId)}`,detail:`${row.provider||'ללא חברה'} · ${formatMoney(Number(row.annualCost)/12)} לחודש · מסתיים ${prettyDate(row.endDate)}`})}/>
      <RecordPanel kind="expenses" title="טיפולים" action="הוספת טיפול" records={expenses} disabled={!vehicles.length} fields={[{key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'סוג טיפול',options:[{value:'Maintenance',label:'טיפול תקופתי'},{value:'Repair',label:'תיקון'},{value:'Other',label:'אחר'}]},{key:'title',label:'תיאור הטיפול',max:150},numberField('amount','עלות',1000000),dateField,{key:'nextServiceDate',label:'מועד הטיפול הבא',type:'date',optional:true},{key:'reminderDays',label:'התראה לפני הטיפול',type:'number',optional:true,options:[{value:'',label:'ללא התראה'},{value:'0',label:'ביום הטיפול'},{value:'7',label:'שבוע לפני'},{value:'30',label:'חודש לפני'}]},{key:'reminderTime',label:'שעת ההתראה',options:reminderTimes.map(value=>({value,label:value}))},{key:'notes',label:'הערות',optional:true,max:2000}]} defaults={{nextServiceDate:null,reminderDays:null,reminderTime:'09:00',vehicleId:vehicles[0]?.id??'',type:'Maintenance',title:'',amount:'',date:summary.today,notes:''}} describe={row=>({title:`${row.title} · ${vehicleName(row.vehicleId)}`,detail:`${prettyDate(row.date)} · ${formatMoney(Number(row.amount))}`})}/>
      <MonthlyCostChart fuel={fuel} policies={policies} reminders={reminders} expenses={expenses} currency={summary.currency}/>
    </>}
    {module === 'nutrition' && <>
      <FoodBank today={summary.today} onFood={setNutritionDraft}/>
      <NutritionScanner today={summary.today} onProduct={setNutritionDraft}/>
      <RecordPanel kind="nutrition" title="מה אכלתי" action="הוספת ארוחה" records={nutrition} externalDraft={nutritionDraft} onDraftConsumed={()=>setNutritionDraft(null)} fields={[{ key: 'name', label: 'מה אכלת?', max: 200 }, {key:'meal',label:'',hidden:true}, dateField,numberField('quantity','כמות בגרם',10000,0.01,'0.01'),{key:'unit',label:'',hidden:true}, numberField('calories', 'קלוריות', 100000), numberField('proteinG', 'חלבון (גרם)', 10000, 0, '0.1'),numberField('carbsG','פחמימות (גרם)',10000,0,'0.1'),numberField('fatG','שומן (גרם)',10000,0,'0.1'),{key:'barcode',label:'',hidden:true}]} defaults={{ name: '', meal: 'Other', date: summary.today,quantity:100,unit:'גרם', calories: '', proteinG: '',carbsG:0,fatG:0,barcode:'' }} describe={row => ({ title: String(row.name), detail: `${prettyDate(row.date)} · ${row.quantity} ${row.unit||'גרם'} · ${row.calories} קלוריות · ${row.proteinG} גרם חלבון · ${row.carbsG} גרם פחמימות · ${row.fatG} גרם שומן` })}/>
      <Goals module="nutrition" summary={summary}/>
    </>}
  </div>;
}
