'use client';
import {ChevronLeft,ChevronRight,Plus,Sparkles} from 'lucide-react';
import type {ModuleRecord} from '@/lib/modules';
import {vehicleMonthCosts} from '@/lib/vehicle-costs';
type Props={month:string;today:string;currency:string;fuel:ModuleRecord[];policies:ModuleRecord[];reminders:ModuleRecord[];expenses:ModuleRecord[];disabled:boolean;historyOpen:boolean;onMonth:(month:string)=>void;onHistory:()=>void;onAddWash:()=>void};
export function VehicleCostSummary(props:Props){
 const {month,currency,onMonth}=props,totals=vehicleMonthCosts(props),format=(value:number)=>new Intl.NumberFormat('he-IL',{style:'currency',currency,maximumFractionDigits:2}).format(value);
 function move(delta:number){const date=new Date(`${month}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+delta);onMonth(date.toISOString().slice(0,7));}
 return <section className="vehicle-cost-summary" aria-label="הוצאות רכב בחודש שנבחר"><header><div><h2>הוצאות הרכב</h2><small>כל הוצאה חד־פעמית משויכת לחודש שבו נרשמה</small></div><div className="vehicle-month-picker"><button className="icon-button" aria-label="חודש הוצאות קודם" onClick={()=>move(-1)}><ChevronRight/></button><label><span>חודש</span><input aria-label="חודש הוצאות רכב" type="month" value={month} onChange={e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))onMonth(e.target.value);}}/></label><button className="icon-button" aria-label="חודש הוצאות הבא" onClick={()=>move(1)}><ChevronLeft/></button></div></header><div className="vehicle-cost-tiles">
  <div data-cost="fuel"><small>דלק</small><strong>{format(totals.fuel)}</strong></div>
  <button className="wash-cost-tile" data-cost="carWashes" aria-controls="car-wash-history" aria-expanded={props.historyOpen} onClick={props.onHistory}><span><Sparkles size={16}/>שטיפות</span><strong>{format(totals.carWashes)}</strong><small>{totals.washCount?`${totals.washCount} שטיפות`:'אין שטיפות החודש'}</small></button>
  <div data-cost="maintenance"><small>טיפולים וטסט</small><strong>{format(totals.maintenance)}</strong></div>
  <div data-cost="parking"><small>חניה וכבישי אגרה</small><strong>{format(totals.parking)}</strong></div>
  <div data-cost="insurance"><small>ביטוח חודשי</small><strong>{format(totals.insurance)}</strong></div>
  <div data-cost="other"><small>הוצאות נוספות</small><strong>{format(totals.other)}</strong></div>
 </div><footer><div data-cost="total"><small>סה״כ בחודש</small><strong>{format(totals.total)}</strong></div><div data-cost="perKm"><small>עלות לק״מ שתועד</small><strong>{totals.costPerKm===null?'—':format(totals.costPerKm)}</strong><small>{totals.distanceKm?`${totals.distanceKm.toLocaleString('he-IL')} ק״מ במקטעים מדודים בחודש`:'יופיע לאחר תדלוקים מלאים עם מרחק באותו חודש'}</small></div><button className="button secondary" disabled={props.disabled} onClick={props.onAddWash}>הוספת שטיפה<Plus size={16}/></button></footer></section>;
}
