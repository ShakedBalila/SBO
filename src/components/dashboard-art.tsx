// Frame the artwork in the user-provided reference; live text is rendered separately.
const frames={tasks:'24 258 342 226',water:'24 507 326 222',nutrition:'24 750 326 236',car:'24 1011 330 235'};
export function DashboardArt({kind}:{kind:keyof typeof frames}){
  return <div className="dashboard-art" aria-hidden="true"><svg viewBox={frames[kind]} preserveAspectRatio="xMidYMid slice"><image href="/dashboard-reference.jpg" width="709" height="1536"/></svg></div>;
}
export function DashboardRing({value,goal,label}:{value:number;goal:number|null|undefined;label:string}){
  const percent=goal&&goal>0?Math.min(100,Math.round(value/goal*100)):0;
  return <div className="dashboard-gauge"><div className="dashboard-ring" style={{'--fill':`${percent}%`} as React.CSSProperties}><strong>{goal?`${percent}%`:value.toLocaleString('he-IL')}</strong></div><span dir="ltr">{value.toLocaleString('he-IL')}{goal?` / ${goal.toLocaleString('he-IL')}`:''}</span><small>{label}</small></div>;
}
