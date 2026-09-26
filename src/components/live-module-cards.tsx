import {TransitionLink as Link} from '@/components/transition-link';
import {ChevronLeft} from 'lucide-react';
import type {moduleData} from '@/lib/module-data';
import {DashboardArt,DashboardRing} from './dashboard-art';
export function LiveModuleCards({summary}:{summary:Awaited<ReturnType<typeof moduleData>>}){
 const waterGoal=summary.settings?.waterGoalMl,calorieGoal=summary.settings?.calorieGoal,proteinGoal=summary.settings?.proteinGoalG;
 const waterPercent=waterGoal?Math.round(summary.waterMl/waterGoal*100):0;
 return <>
  <Link href="/water" className="overview-card overview-water"><DashboardArt kind="water"/><div className="overview-content"><h2>צריכת מים יומית<ChevronLeft aria-hidden="true"/></h2><strong className="water-overview-percent">{waterPercent}%</strong><p>{summary.waterMl.toLocaleString('he-IL')} / {waterGoal?.toLocaleString('he-IL')??'טרם הוגדר יעד'} מ״ל</p><div className="overview-water-meter" role="progressbar" aria-label="התקדמות שתייה" aria-valuenow={Math.min(100,waterPercent)} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${Math.min(100,waterPercent)}%`}}/></div></div></Link>
  <Link href="/nutrition" className="overview-card overview-nutrition"><DashboardArt kind="nutrition"/><div className="overview-content"><h2>תזונה<ChevronLeft aria-hidden="true"/></h2><div className="nutrition-overview-gauges"><DashboardRing value={summary.calories} goal={calorieGoal} label="קלוריות"/><DashboardRing value={summary.proteinG} goal={proteinGoal} label="גרם חלבון"/></div></div></Link>
  <Link href="/car" className="overview-card overview-car"><DashboardArt kind="car"/><div className="overview-content"><h2>רכב<ChevronLeft aria-hidden="true"/></h2><strong className="overview-car-name">{summary.vehicles[0]?.name??'טרם הוגדר רכב'}</strong><p>{summary.vehicles[0]?.licensePlate}</p><strong className="overview-car-cost">{new Intl.NumberFormat('he-IL',{style:'currency',currency:summary.settings?.currency??'ILS',maximumFractionDigits:0}).format(summary.fuelCost)}</strong><p>עלות הדלק החודש</p></div></Link>
 </>;
}
