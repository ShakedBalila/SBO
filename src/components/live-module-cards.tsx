import Link from 'next/link';
import { ArrowUpRight, ArrowRight, CarFront, Utensils } from 'lucide-react';
import type { moduleData } from '@/lib/module-data';
import { WaterBottleIcon } from '@/components/water-bottle-icon';
import { VehicleBrandLogo } from '@/components/vehicle-brand-logo';
export function LiveModuleCards({ summary }: { summary: Awaited<ReturnType<typeof moduleData>> }) {
  const waterGoal = summary.settings?.waterGoalMl;
  const calorieGoal = summary.settings?.calorieGoal;
  const currency = summary.settings?.currency ?? 'ILS';
  const waterMax=Math.max(waterGoal??1,...summary.waterWeek.map(day=>day.amountMl));
  return <>
    <Link href="/water" className="module-card water-card">
      <div className="card-top"><span className="module-icon"><WaterBottleIcon/></span><span className="card-label">צריכת מים יומית<small>מעקב שתייה יומי</small></span><ArrowUpRight className="card-arrow" size={20}/></div>
      <div className="live-card-body water-overview-body"><div><div className="big-number metric-ring" style={{"--metric-progress":`${Math.min(100,summary.waterMl/(waterGoal||1)*100)}%`} as React.CSSProperties}>{summary.waterMl.toLocaleString('he-IL')}<span>מ״ל היום</span></div><p>{waterGoal ? `מתוך יעד יומי של ${waterGoal.toLocaleString('he-IL')} מ״ל` : 'הגדרת יעד שתייה יומי'}</p></div><div className="home-water-week" aria-label="התקדמות השתייה השבועית">{summary.waterWeek.map((day,index)=><span className={day.date===summary.today?'today':''} key={day.date}><i style={{height:`${Math.min(100,day.amountMl/waterMax*100)}%`}}/><b>{['א','ב','ג','ד','ה','ו','ש'][index]}</b></span>)}</div>
      </div><div className="card-footer">הוספת שתייה<ArrowRight size={16}/></div>
    </Link>
    <Link href="/car" className="module-card car-card">
      <div className="card-top"><span className="module-icon"><CarFront/></span><span className="card-label">תחזוקת רכב חודשית<small>הרכב והדלק החודשי שלך</small></span><ArrowUpRight className="card-arrow" size={20}/></div>
      <div className="live-card-body car-overview-body"><div className="overview-vehicle">{summary.vehicles[0]?<><VehicleBrandLogo name={summary.vehicles[0].name}/><div><strong>{summary.vehicles[0].name}</strong><span>{[summary.vehicles[0].year&&summary.vehicles[0].roadMonth?`${String(summary.vehicles[0].roadMonth).padStart(2,'0')}/${summary.vehicles[0].year}`:null,summary.vehicles[0].licensePlate].filter(Boolean).join(' · ')}</span></div></>:<><VehicleBrandLogo name=""/><div><strong>טרם הוגדר רכב</strong><span>ניתן להוסיף רכב במסך התחזוקה</span></div></>}</div><div><div className="big-number">{new Intl.NumberFormat('he-IL',{style:'currency',currency,maximumFractionDigits:0}).format(summary.fuelCost)}</div><p>עלות הדלק החודש</p></div></div>
      <div className="card-footer">תחזוקת הרכב<ArrowRight size={16}/></div>
    </Link>
    <Link href="/nutrition" className="module-card nutrition-card">
      <div className="card-top"><span className="module-icon"><Utensils/></span><span className="card-label">תזונה<small>הארוחות והיעדים שלך</small></span><ArrowUpRight className="card-arrow" size={20}/></div>
      <div className="live-card-body"><div className="big-number metric-ring" style={{"--metric-progress":`${Math.min(100,summary.calories/(calorieGoal||1)*100)}%`} as React.CSSProperties}>{summary.calories.toLocaleString('he-IL')}<span>קלוריות היום</span></div><p>{summary.proteinG.toLocaleString('he-IL')} גרם חלבון{calorieGoal ? ` · יעד ${calorieGoal.toLocaleString('he-IL')} קלוריות` : ''}</p>
        {calorieGoal && <div className="card-meter" role="progressbar" aria-label="יעד קלוריות" aria-valuenow={Math.min(100, Math.round(summary.calories / calorieGoal * 100))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, summary.calories / calorieGoal * 100)}%` }}/></div>}
      </div><div className="card-footer">הוספת ארוחה<ArrowRight size={16}/></div>
    </Link>
  </>;
}
