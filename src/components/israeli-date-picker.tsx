"use client";
import { CalendarDays } from "lucide-react";

export function IsraeliDatePicker({value,onChange,min,required=false,label="בחירת תאריך"}:{value:string|null;onChange:(value:string|null)=>void;min?:string|null;required?:boolean;label?:string}){
  const display=value?`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`:"יום/חודש/שנה";
  return <span className={`israeli-date-picker ${value?'has-value':''}`}><span>{display}</span><CalendarDays size={18}/><input aria-label={label} type="date" lang="he-IL" value={value??""} min={min??undefined} required={required} onChange={event=>onChange(event.target.value||null)}/></span>;
}
