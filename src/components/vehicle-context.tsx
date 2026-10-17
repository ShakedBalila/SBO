'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {ModuleRecord} from '@/lib/modules';
import {accountRequest} from './account-client';
export function VehicleContext({vehicles,selected,onSelect}:{vehicles:ModuleRecord[];selected:string;onSelect:(id:string)=>void}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),vehicle=vehicles.find(v=>v.id===selected);
 async function act(action:string){setBusy(true);setMessage('');try{await accountRequest('/api/vehicle-management',{id:selected,action});if(action==='archive'){const next=vehicles.find(v=>v.id!==selected&&!v.archivedAt);onSelect(String(next?.id??selected));}router.refresh();setMessage(action==='archive'?'הרכב הועבר לארכיון. ההיסטוריה נשמרה והתראותיו הושהו.':'הרכב עודכן.');}catch(e){setMessage(e instanceof Error?e.message:'לא ניתן לעדכן.');}finally{setBusy(false);}}
 return <section className="vehicle-context-panel"><label>רכב לתצוגה<select aria-label="רכב לתצוגה" value={selected} disabled={busy} onChange={e=>onSelect(e.target.value)}>{vehicles.map(v=><option key={v.id} value={v.id}>{String(v.name)} · {String(v.licensePlate)}{v.archivedAt?' · ארכיון':v.isPrimary?' · ראשי':''}</option>)}</select></label>{vehicle&&<div className="v6-actions">{!vehicle.archivedAt&&!vehicle.isPrimary&&<button className="button secondary" disabled={busy} onClick={()=>void act('primary')}>הגדרה כרכב ראשי</button>}{vehicle.archivedAt?<button className="button secondary" disabled={busy} onClick={()=>void act('restore')}>שחזור מהארכיון</button>:<button className="button secondary" disabled={busy} onClick={()=>void act('archive')}>העברה לארכיון</button>}</div>}{message&&<p role="status">{message}</p>}</section>;
}
