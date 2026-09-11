"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X, Droplets, CarFront, Utensils } from 'lucide-react';
import type { ModuleRecord, RecordKind } from '@/lib/modules';

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date'; min?: number; max?: number; step?: string; optional?: boolean; hidden?: boolean; options?: { value: string; label: string }[] };
type Summary = { today: string; waterMl: number; calories: number; proteinG: number; fuelCost: number; waterGoalMl: number | null; calorieGoal: number | null; proteinGoalG: number | null; currency: string };
const dateField: Field = { key: 'date', label: 'תאריך', type: 'date' };
const numberField = (key: string, label: string, max: number, min = 0, step = '1'): Field => ({ key, label, type: 'number', min, max, step });
const prettyDate = (value: string | number | null) => new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(String(value)));
async function save(kind: string, data?: object, id?: string, remove = false) {
  const result = await fetch(`/api/modules/${kind}${id ? `/${id}` : ''}`, {
    method: remove ? 'DELETE' : id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined
  });
  const body = await result.json();
  if (!result.ok) throw new Error(body.error ?? 'לא ניתן לשמור. נסה שוב.');
}

function RecordPanel({ kind, title, action, fields, records, defaults, describe, disabled = false }: {
  kind: RecordKind; title: string; action: string; fields: Field[]; records: ModuleRecord[];
  defaults: Record<string, string | number | null>; describe: (record: ModuleRecord) => { title: string; detail: string };
  disabled?: boolean;
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
  useEffect(() => setReady(true), []);
  function edit(record: ModuleRecord | null) {
    setError(''); setEditing(record); setValues(record ?? defaults); dialog.current?.showModal();
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
  return <section className="journal-panel">
    <div className="section-heading"><div><h2>{title}</h2><p>{kind === 'vehicles' ? 'הרכבים שלך' : 'רשומות אחרונות · עד 200 מוצגות'}</p></div>
      <button className="button primary" disabled={disabled || !ready || busy} onClick={() => edit(null)}><Plus size={17}/>{action}</button>
    </div>
    <p className="feedback" role="status">{message}</p>
    {disabled && <p className="module-hint">יש להוסיף רכב כדי להתחיל לתעד תדלוקים.</p>}
    {records.length === 0 ? <div className="journal-empty">עדיין אין רשומות. {disabled ? 'היסטוריית התדלוקים תופיע כאן.' : `אפשר לבחור „${action}” כדי להתחיל.`}</div> :
      <div className="journal-list">{records.map(record => {
        const text = describe(record);
        return <article key={record.id} className="journal-row"><div><h3>{text.title}</h3><p>{text.detail}</p></div><div className="row-actions">
          <button className="icon-button" disabled={!ready || busy} aria-label={`עריכת ${text.title}`} onClick={() => edit(record)}><Pencil size={17}/></button>
          <button className="icon-button" disabled={!ready || busy} aria-label={`מחיקת ${text.title}`} onClick={() => { setRemoving(record); setError(''); deletion.current?.showModal(); }}><Trash2 size={17}/></button>
        </div></article>;
      })}</div>}
    <dialog className="modal" ref={dialog} onCancel={event => { if (busy) event.preventDefault(); }}><form onSubmit={submit}>
      <div className="modal-heading"><h2>{editing ? `עריכת רשומה: ${title}` : action}</h2><button type="button" className="icon-button" disabled={busy} aria-label="סגירת הטופס" onClick={() => dialog.current?.close()}><X size={20}/></button></div>
      {fields.filter(field=>!field.hidden).map(field => <label key={field.key} htmlFor={`${kind}-${field.key}`}>{field.label}{field.optional && <span className="optional">לא חובה</span>}
        {field.options ? <select id={`${kind}-${field.key}`} required value={String(values[field.key] ?? '')} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> :
          <input id={`${kind}-${field.key}`} type={field.type ?? 'text'} required={!field.optional} min={field.min} max={field.max} maxLength={field.type === undefined || field.type === 'text' ? field.max ?? 200 : undefined} step={field.step} value={values[field.key] ?? ''} onChange={event => setValues({ ...values, [field.key]: event.target.value })}/>}
      </label>)}
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>ביטול</button><button type="submit" className="button primary" disabled={busy}>{busy ? 'שומר…' : 'שמירת רשומה'}</button></div>
    </form></dialog>
    <dialog className="modal small-modal" ref={deletion} onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2>למחוק את {kind === 'vehicles' ? 'הרכב' : 'הרשומה'}?</h2><p>{kind === 'vehicles' ? 'הרכב וכל התדלוקים שלו יימחקו לצמיתות.' : 'הרשומה תימחק לצמיתות.'}</p>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => deletion.current?.close()}>שמירה</button><button className="button danger" disabled={busy} onClick={async () => {
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
  return <section className="goals-panel"><h2>היעדים היומיים שלך</h2><p>היעדים נשמרים עד לשינוי הבא. שדה ריק מבטל יעד.</p><form onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(fields.map(field => [field.key, form.get(field.key) ? Number(form.get(field.key)) : null]));
    try { await save('goals', data); setMessage('היעדים נשמרו.'); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן לשמור.'); } finally { setBusy(false); }
  }}>{fields.map(field => <label key={field.key}>{field.label}<input name={field.key} type="number" min={1} max={field.max} step="1" defaultValue={field.value ?? ''}/></label>)}
    <button className="button secondary" disabled={busy || !ready}>{busy ? 'שומר…' : 'שמירת יעדים'}</button>
  </form>{error && <p className="error-text" role="alert">{error}</p>}<p className="feedback" role="status">{message}</p></section>;
}

export function ModuleWorkspace({ module, summary, water, vehicles, fuel, nutrition, policies, reminders, fuelPrice }: { module: 'water' | 'car' | 'nutrition'; summary: Summary; water: ModuleRecord[]; vehicles: ModuleRecord[]; fuel: ModuleRecord[]; nutrition: ModuleRecord[]; policies: ModuleRecord[]; reminders: ModuleRecord[]; fuelPrice: { price:number; sourceUrl:string; checkedAt:string; online:boolean } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setReady(true); const refresh = () => router.refresh(); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [router]);
  const title = { water: 'מים', car: 'רכב', nutrition: 'תזונה' }[module];
  const Icon = { water: Droplets, car: CarFront, nutrition: Utensils }[module];
  const formatMoney = (value: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: summary.currency }).format(value);
  const vehicleName = (id: string | number | null) => String(vehicles.find(vehicle => vehicle.id === id)?.name ?? 'רכב');
  const policyType = (value: unknown) => ({ Mandatory: 'חובה', Comprehensive: 'מקיף', 'Third party': 'צד ג׳' }[String(value)] ?? String(value));
  const reminderType = (value: unknown) => ({ Maintenance: 'טיפול', Test: 'טסט' }[String(value)] ?? String(value));
  const mealType = (value: unknown) => ({ Breakfast: 'ארוחת בוקר', Lunch: 'ארוחת צהריים', Dinner: 'ארוחת ערב', Snack: 'נשנוש' }[String(value)] ?? String(value));
  const insuranceMonthly = policies.reduce((sum,row)=>sum+Number(row.annualCost)/12,0);
  const upcoming = reminders.filter(row=>String(row.dueDate)>=summary.today&&String(row.dueDate)<=new Date(new Date(`${summary.today}T00:00:00Z`).getTime()+30*86400000).toISOString().slice(0,10));
  return <>
    <div className="topline"><span>סביבת עבודה <span className="crumb">/</span><strong>{title}</strong></span><span>{prettyDate(summary.today)}</span></div>
    <header className="page-heading"><div><span className="eyebrow">היום־יום שלך</span><h1>{title}<span className="hello-dot">.</span></h1><p>{module === 'water' ? 'כל כוס נחשבת.' : module === 'car' ? 'הרכבים וההוצאות שלך במקום אחד.' : 'הארוחות והיעדים היומיים מול העיניים.'}</p></div><span className={`module-icon ${module}-card`}><Icon/></span></header>
    <section className="module-stats" aria-label={`סיכום ${title}`}>
      {module === 'water' && <><div><small>היום</small><strong>{summary.waterMl.toLocaleString('he-IL')} <span>מ״ל</span></strong></div><div><small>יעד יומי</small><strong>{summary.waterGoalMl?.toLocaleString('he-IL') ?? 'לא הוגדר'} <span>{summary.waterGoalMl ? 'מ״ל' : ''}</span></strong></div><div><small>התקדמות</small><strong>{summary.waterGoalMl ? `${Math.round(summary.waterMl / summary.waterGoalMl * 100)}%` : '—'}</strong></div></>}
      {module === 'car' && <><div><small>בנזין 95 · ישראל</small><strong>{formatMoney(fuelPrice?.price ?? 0)} <span>לליטר</span></strong><small>{fuelPrice?.online?'עודכן מהאינטרנט':'מחיר אחרון שנבדק'} · שירות עצמי</small></div><div><small>דלק החודש</small><strong>{formatMoney(summary.fuelCost)}</strong></div><div><small>ביטוח לחודש</small><strong>{formatMoney(insuranceMonthly)}</strong></div><div><small>התראות קרובות</small><strong>{upcoming.length}</strong></div></>}
      {module === 'nutrition' && <><div><small>קלוריות היום</small><strong>{summary.calories.toLocaleString('he-IL')} <span>קלוריות</span></strong><small>{summary.calorieGoal ? `יעד: ${summary.calorieGoal.toLocaleString('he-IL')}` : 'לא הוגדר יעד'}</small></div><div><small>חלבון היום</small><strong>{summary.proteinG.toLocaleString('he-IL')} <span>גרם</span></strong><small>{summary.proteinGoalG ? `יעד: ${summary.proteinGoalG.toLocaleString('he-IL')} גרם` : 'לא הוגדר יעד'}</small></div></>}
    </section>
    {module === 'water' && <>
      <div className="quick-water"><h2>הוספה מהירה להיום</h2><div>{[250, 500, 750, 1000].map(amount => <button key={amount} className="button secondary" disabled={busy || !ready} onClick={async () => {
        setBusy(true); setError(''); setMessage('');
        try { await save('water', { amountMl: amount, date: summary.today }); setMessage(`נוספו ${amount} מ״ל.`); router.refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : 'לא ניתן לשמור.'); } finally { setBusy(false); }
      }}><Plus size={15}/>{amount} מ״ל</button>)}</div><p role="status" className="feedback">{message}</p>{error && <p role="alert" className="error-text">{error}</p>}</div>
      <RecordPanel kind="water" title="היסטוריית שתייה" action="הוספת מים" fields={[numberField('amountMl', 'כמות (מ״ל)', 10000, 1), dateField]} records={water} defaults={{ amountMl: 250, date: summary.today }} describe={row => ({ title: `${row.amountMl} מ״ל`, detail: prettyDate(row.date) })}/>
      <Goals module="water" summary={summary}/>
    </>}
    {module === 'car' && <>
      {fuelPrice&&<p className="source-note">{fuelPrice.online?'המחיר המרבי בשירות עצמי עודכן מהאינטרנט':'בדיקת המחיר באינטרנט אינה זמינה; מוצג המחיר המאומת האחרון'}: {formatMoney(fuelPrice.price)} לליטר. <a href={fuelPrice.sourceUrl} target="_blank" rel="noreferrer">צפייה במקור</a></p>}
      {upcoming.length>0&&<section className="alerts-panel"><h2>אירועים ב־30 הימים הקרובים</h2>{upcoming.map(row=><p key={row.id}><strong>{row.title}</strong> · {vehicleName(row.vehicleId)} · {prettyDate(row.dueDate)}</p>)}</section>}
      <RecordPanel kind="vehicles" title="רכבים" action="הוספת רכב" records={vehicles} fields={[{ key: 'name', label: 'שם הרכב', max: 100 }, { key: 'licensePlate', label: 'מספר רישוי', optional: true, max: 30 }, { ...numberField('year', 'שנת ייצור', 2100, 1900), optional: true }, numberField('odometerKm', 'קילומטראז׳ נוכחי', 10000000), numberField('fuelTankLiters','נפח מכל הדלק (ליטר)',1000,1,'0.1')]} defaults={{ name: '', licensePlate: '', year: null, odometerKm: 0, fuelTankLiters: '' }} describe={row => ({ title: String(row.name), detail: [row.year, row.licensePlate, `${Number(row.odometerKm).toLocaleString('he-IL')} ק״מ`,row.fuelTankLiters?`מכל ${row.fuelTankLiters} ליטר`:null].filter(Boolean).join(' · ') })}/>
      <RecordPanel kind="fuel" title="היסטוריית תדלוקים" action="הוספת תדלוק" records={fuel} disabled={!vehicles.length} fields={[{ key: 'vehicleId', label: 'רכב', options: vehicles.map(row => ({ value: row.id, label: String(row.name) })) }, dateField, numberField('estimatedRangeKm', 'טווח נסיעה משוער שמציג הרכב (ק״מ)', 100000,1), { ...numberField('actualDistanceKm', 'מרחק שבוצע בפועל (ק״מ)',100000), optional:true }, numberField('liters', 'כמות ליטרים בתדלוק', 10000, 0.01, '0.01'), {...numberField('pricePerLiter','מחיר הדלק מהאינטרנט',10000,0,'0.001'),hidden:true}]} defaults={{ vehicleId: vehicles[0]?.id ?? '', date: summary.today, estimatedRangeKm: '', actualDistanceKm: null, liters: '', pricePerLiter: fuelPrice?.price ?? 0 }} describe={row => ({ title: `${vehicleName(row.vehicleId)} · ${row.liters} ליטר`, detail: `${prettyDate(row.date)} · טווח משוער ${Number(row.estimatedRangeKm).toLocaleString('he-IL')} ק״מ${row.actualDistanceKm?` · בפועל ${Number(row.actualDistanceKm).toLocaleString('he-IL')} ק״מ`:''} · ${formatMoney(Number(row.liters) * Number(row.pricePerLiter))}` })}/>
      <RecordPanel kind="policies" title="ביטוחים" action="הוספת ביטוח" records={policies} disabled={!vehicles.length} fields={[{ key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'סוג הביטוח',options:[{value:'Mandatory',label:'חובה'},{value:'Comprehensive',label:'מקיף'},{value:'Third party',label:'צד ג׳'}]},{key:'provider',label:'חברת ביטוח',optional:true,max:100},numberField('annualCost','עלות שנתית',1000000),{key:'startDate',label:'תאריך התחלה',type:'date'},{key:'endDate',label:'תאריך סיום',type:'date'}]} defaults={{vehicleId:vehicles[0]?.id??'',type:'Mandatory',provider:'',annualCost:'',startDate:summary.today,endDate:summary.today}} describe={row=>({title:`${policyType(row.type)} · ${vehicleName(row.vehicleId)}`,detail:`${row.provider||'ללא חברה'} · ${formatMoney(Number(row.annualCost)/12)} לחודש · מסתיים ${prettyDate(row.endDate)}`})}/>
      <RecordPanel kind="reminders" title="טיפולים וטסט" action="הוספת תזכורת" records={reminders} disabled={!vehicles.length} fields={[{key:'vehicleId',label:'רכב',options:vehicles.map(row=>({value:row.id,label:String(row.name)}))},{key:'type',label:'סוג',options:[{value:'Maintenance',label:'טיפול'},{value:'Test',label:'טסט'}]},{key:'title',label:'כותרת',max:150},{key:'dueDate',label:'תאריך יעד',type:'date'},{...numberField('cost','עלות צפויה או בפועל',1000000),optional:true},{key:'notes',label:'הערות',optional:true,max:2000}]} defaults={{vehicleId:vehicles[0]?.id??'',type:'Maintenance',title:'',dueDate:summary.today,cost:null,notes:''}} describe={row=>({title:`${row.title} · ${vehicleName(row.vehicleId)}`,detail:`${reminderType(row.type)} · ${prettyDate(row.dueDate)}${row.cost?` · ${formatMoney(Number(row.cost))}`:''}`})}/>
    </>}
    {module === 'nutrition' && <>
      <RecordPanel kind="nutrition" title="היסטוריית ארוחות" action="הוספת ארוחה" records={nutrition} fields={[{ key: 'name', label: 'מזון או ארוחה', max: 200 }, { key: 'meal', label: 'סוג הארוחה', options: [{value:'Breakfast',label:'ארוחת בוקר'},{value:'Lunch',label:'ארוחת צהריים'},{value:'Dinner',label:'ארוחת ערב'},{value:'Snack',label:'נשנוש'}] }, dateField, numberField('calories', 'קלוריות', 100000), numberField('proteinG', 'חלבון (גרם)', 10000, 0, '0.1')]} defaults={{ name: '', meal: 'Breakfast', date: summary.today, calories: '', proteinG: '' }} describe={row => ({ title: String(row.name), detail: `${prettyDate(row.date)} · ${mealType(row.meal)} · ${row.calories} קלוריות · ${row.proteinG} גרם חלבון` })}/>
      <Goals module="nutrition" summary={summary}/>
    </>}
  </>;
}
