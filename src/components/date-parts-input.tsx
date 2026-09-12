"use client";
type Props={value:string|null;onChange:(value:string|null)=>void;required?:boolean;min?:string|null};
export function DatePartsInput({value,onChange,required=false,min=null}:Props){
  const now=new Date(),parts=value?.split("-")??["","",""];
  const year=parts[0]??"",month=parts[1]??"",day=parts[2]??"";
  const days=year&&month?new Date(Number(year),Number(month),0).getDate():31;
  function set(part:"day"|"month"|"year",next:string){const y=part==="year"?next:year,m=part==="month"?next:month,d=part==="day"?next:day;if(!y&&!m&&!d){onChange(null);return;}if(y&&m&&d){const candidate=`${y}-${m.padStart(2,"0")}-${String(Math.min(Number(d),new Date(Number(y),Number(m),0).getDate())).padStart(2,"0")}`;onChange(!min||candidate>=min?candidate:min);return;}onChange([y,m,d].join("-") as string);}
  return <span className="date-parts" dir="rtl"><select aria-label="יום" required={required} value={day} onChange={e=>set("day",e.target.value)}><option value="">יום</option>{Array.from({length:days},(_,i)=>i+1).map(v=><option key={v} value={String(v).padStart(2,"0")}>{v}</option>)}</select><select aria-label="חודש" required={required} value={month} onChange={e=>set("month",e.target.value)}><option value="">חודש</option>{Array.from({length:12},(_,i)=>i+1).map(v=><option key={v} value={String(v).padStart(2,"0")}>{v}</option>)}</select><select aria-label="שנה" required={required} value={year} onChange={e=>set("year",e.target.value)}><option value="">שנה</option>{Array.from({length:16},(_,i)=>now.getFullYear()-2+i).map(v=><option key={v}>{v}</option>)}</select></span>;
}
