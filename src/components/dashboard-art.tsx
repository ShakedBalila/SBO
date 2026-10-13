import Image from 'next/image';
const media={workouts:'/overview-workouts.webp',tasks:'/overview-tasks.webp',work:'/overview-work.webp',water:'/overview-water.webp',nutrition:'/overview-nutrition.webp',car:'/overview-car.webp'};
export function DashboardArt({kind}:{kind:keyof typeof media}){
  return <div className={`dashboard-art card-image-layer media-${kind}`} aria-hidden="true"><Image className={kind==='car'?'dashboard-car-photo':''} src={media[kind]} overrideSrc={media[kind]} alt="" width={kind==='car'?1536:1024} height={kind==='car'?1024:1536} unoptimized sizes={kind==='car'?'(max-width: 1194px) 36vw, 450px':'(max-width: 650px) 25vw, (max-width: 1194px) 25vw, 320px'}/><span className="card-overlay-layer"/><span className="card-gradient-fade"/></div>;
}
export function DashboardRing({value,goal,label}:{value:number;goal:number|null|undefined;label:string}){
  const percent=goal&&goal>0?Math.min(100,Math.round(value/goal*100)):0;
  return <div className="dashboard-gauge"><div className="dashboard-ring" style={{'--fill':`${percent}%`} as React.CSSProperties}><strong className={value.toLocaleString('he-IL').length>4?'metric-large':undefined}>{value.toLocaleString('he-IL')}</strong></div>{goal&&<span className="gauge-target" dir="ltr">מתוך {goal.toLocaleString('he-IL')}</span>}<small>{label}</small></div>;
}
