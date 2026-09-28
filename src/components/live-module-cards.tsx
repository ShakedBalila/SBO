import {TransitionLink as Link} from '@/components/transition-link';
import {ChevronLeft} from 'lucide-react';
import type {moduleData} from '@/lib/module-data';
import {DashboardArt,DashboardRing} from './dashboard-art';
export function LiveModuleCards({summary}:{summary:Awaited<ReturnType<typeof moduleData>>}){
 const waterGoal=summary.settings?.waterGoalMl,calorieGoal=summary.settings?.calorieGoal,proteinGoal=summary.settings?.proteinGoalG;
 const waterPercent=waterGoal?Math.round(summary.waterMl/waterGoal*100):0;
 const vehicle=summary.vehicles[0],vehiclePolicies=summary.policies.filter(item=>item.vehicleId===vehicle?.id),test=summary.tests.find(item=>item.vehicleId===vehicle?.id);
 const policyTypes=[['Mandatory','ביטוח חובה'],['Comprehensive','ביטוח מקיף'],['ThirdParty','ביטוח צד ג׳']] as const;
 const date=(value:Date|null|undefined)=>value?new Intl.DateTimeFormat('he-IL',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(value):'לא הוזן';
 return <>
  <Link href="/water" className="overview-card overview-water"><DashboardArt kind="water"/><div className="overview-content"><h2>צריכת מים יומית<ChevronLeft aria-hidden="true"/></h2><strong className="water-overview-percent">{waterPercent}%</strong><p>{summary.waterMl.toLocaleString('he-IL')} / {waterGoal?.toLocaleString('he-IL')??'טרם הוגדר יעד'} מ״ל</p><div className="overview-water-meter" role="progressbar" aria-label="התקדמות שתייה" aria-valuenow={Math.min(100,waterPercent)} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${Math.min(100,waterPercent)}%`}}/></div></div></Link>
  <Link href="/nutrition" className="overview-card overview-nutrition"><DashboardArt kind="nutrition"/><div className="overview-content"><h2>תזונה<ChevronLeft aria-hidden="true"/></h2><div className="nutrition-overview-gauges"><DashboardRing value={summary.calories} goal={calorieGoal} label="קלוריות"/><DashboardRing value={summary.proteinG} goal={proteinGoal} label="גרם חלבון"/></div></div></Link>
  <Link href="/car" className="overview-card overview-car"><img className="dashboard-car-photo" src={vehicle?.name.toLowerCase().includes('mazda')||vehicle?.name.includes('מאזדה')?'/mazda-3-black.png':'/dashboard-reference.jpg'} alt=""/><div className="overview-content"><h2>רכב<ChevronLeft aria-hidden="true"/></h2><strong className="overview-car-name">{vehicle?.name??'טרם הוגדר רכב'}</strong><p>{vehicle?.licensePlate}</p><div className="vehicle-expiries"><span><small>תוקף טסט</small><strong>{test?date(test.expiryDate):'לא הוזן תוקף טסט'}</strong></span>{policyTypes.map(([type,label])=>{const policy=vehiclePolicies.find(item=>item.type===type);return <span key={type}><small>{label}</small><strong>{policy?date(policy.endDate):'לא הוזן תוקף ביטוח'}</strong></span>})}</div></div></Link>
 </>;
}
