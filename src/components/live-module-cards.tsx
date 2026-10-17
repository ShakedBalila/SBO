import {TransitionLink as Link} from '@/components/transition-link';
import {ChevronLeft} from 'lucide-react';
import type {moduleData} from '@/lib/module-data';
import {DashboardArt,DashboardRing} from './dashboard-art';
export function LiveModuleCards({summary,enabled=["water","nutrition","car"],order=["water","nutrition","car"]}:{summary:Awaited<ReturnType<typeof moduleData>>;enabled?:string[];order?:string[]}){
 const waterGoal=summary.settings?.waterGoalMl,calorieGoal=summary.settings?.calorieGoal,proteinGoal=summary.settings?.proteinGoalG;
 const waterPercent=waterGoal?Math.round(summary.waterMl/waterGoal*100):0;
 const vehicle=summary.vehicles[0],vehiclePolicies=summary.policies.filter(item=>item.vehicleId===vehicle?.id),test=summary.tests.find(item=>item.vehicleId===vehicle?.id);
 const expiryItems=[...vehiclePolicies.map(p=>({label:p.type==='Mandatory'?'ביטוח חובה':p.type==='Comprehensive'?'ביטוח מקיף':'ביטוח צד ג׳',date:p.endDate})),...(test?.expiryDate?[{label:'טסט',date:test.expiryDate}]:[])].sort((a,b)=>a.date.valueOf()-b.date.valueOf());const urgent=expiryItems[0];const shortDate=(d:Date)=>new Intl.DateTimeFormat('he-IL',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'UTC'}).format(d);
 return <>
  {enabled.includes("water")&&<Link style={{order:order.indexOf("water")}} href="/water" className="overview-card overview-water"><DashboardArt kind="water"/><div className="overview-content"><h2><span className="overview-water-title-long">צריכת מים יומית</span><span className="overview-water-title-short">מים</span></h2><strong className="water-overview-percent">{waterPercent}%</strong><p>{summary.waterMl.toLocaleString('he-IL')} {waterGoal?`/ ${waterGoal.toLocaleString('he-IL')} מ״ל`:'מ״ל · ללא יעד'}</p><div className="overview-water-meter" role="progressbar" aria-label="התקדמות שתייה" aria-valuenow={Math.min(100,waterPercent)} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${Math.min(100,waterPercent)}%`}}/></div></div></Link>}
  {enabled.includes("nutrition")&&<Link style={{order:order.indexOf("nutrition")}} href="/nutrition" className="overview-card overview-nutrition"><DashboardArt kind="nutrition"/><div className="overview-content"><h2>תזונה</h2><div className="nutrition-overview-gauges"><DashboardRing value={summary.calories} goal={calorieGoal} label="קלוריות"/><DashboardRing value={summary.proteinG} goal={proteinGoal} label="גרם חלבון"/></div></div></Link>}
  {enabled.includes("car")&&<Link style={{order:order.indexOf("car")}} href="/car" className="overview-card overview-car"><DashboardArt kind="car"/><div className="overview-content"><h2>רכב</h2><strong className="overview-car-name">{vehicle?.name??'טרם הוגדר רכב'}</strong><p className="overview-plate">{vehicle?.licensePlate||'לוחית רישוי לא הוזנה'}</p></div></Link>}
 </>;
}
