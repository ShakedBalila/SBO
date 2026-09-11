import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Droplets, CarFront, Utensils } from 'lucide-react';
import type { moduleData } from '@/lib/module-data';
export function LiveModuleCards({ summary }: { summary: Awaited<ReturnType<typeof moduleData>> }) {
  const waterGoal = summary.settings?.waterGoalMl;
  const calorieGoal = summary.settings?.calorieGoal;
  const currency = summary.settings?.currency ?? 'ILS';
  return <>
    <Link href="/water" className="module-card water-card">
      <div className="card-top"><span className="module-icon"><Droplets/></span><span className="card-label">מים<small>כל כוס נחשבת</small></span><ArrowUpRight className="card-arrow" size={20}/></div>
      <div className="live-card-body"><div className="big-number">{summary.waterMl.toLocaleString('he-IL')}<span>מ״ל היום</span></div><p>{waterGoal ? `מתוך יעד יומי של ${waterGoal.toLocaleString('he-IL')} מ״ל` : 'הגדרת יעד שתייה יומי'}</p>
        {waterGoal && <div className="card-meter" role="progressbar" aria-label="יעד מים" aria-valuenow={Math.min(100, Math.round(summary.waterMl / waterGoal * 100))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, summary.waterMl / waterGoal * 100)}%` }}/></div>}
      </div><div className="card-footer">הוספת שתייה<ArrowRight size={16}/></div>
    </Link>
    <Link href="/car" className="module-card car-card">
      <div className="card-top"><span className="module-icon"><CarFront/></span><span className="card-label">רכב<small>כל הוצאות הרכב במקום אחד</small></span><ArrowUpRight className="card-arrow" size={20}/></div>
      <div className="live-card-body"><div className="big-number">{new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(summary.fuelCost)}</div><p>דלק החודש · {summary.vehicleCount} {summary.vehicleCount === 1 ? 'רכב' : 'רכבים'}</p></div>
      <div className="card-footer">רכבים ודלק<ArrowRight size={16}/></div>
    </Link>
    <Link href="/nutrition" className="module-card nutrition-card">
      <div className="card-top"><span className="module-icon"><Utensils/></span><span className="card-label">תזונה<small>הארוחות והיעדים שלך</small></span><ArrowUpRight className="card-arrow" size={20}/></div>
      <div className="live-card-body"><div className="big-number">{summary.calories.toLocaleString('he-IL')}<span>קלוריות היום</span></div><p>{summary.proteinG.toLocaleString('he-IL')} גרם חלבון{calorieGoal ? ` · יעד ${calorieGoal.toLocaleString('he-IL')} קלוריות` : ''}</p>
        {calorieGoal && <div className="card-meter" role="progressbar" aria-label="יעד קלוריות" aria-valuenow={Math.min(100, Math.round(summary.calories / calorieGoal * 100))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, summary.calories / calorieGoal * 100)}%` }}/></div>}
      </div><div className="card-footer">הוספת ארוחה<ArrowRight size={16}/></div>
    </Link>
  </>;
}
