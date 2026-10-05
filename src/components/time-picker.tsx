'use client';
import {Clock3} from 'lucide-react';
export function TimePicker({value,onChange,label='בחירת שעה',required=false}:{value:string;onChange:(value:string)=>void;label?:string;required?:boolean}){return <span className="time-picker"><span>{value||'--:--'}</span><Clock3 size={18}/><input type="time" lang="he-IL" aria-label={label} value={value} required={required} onChange={event=>onChange(event.target.value)} onClick={event=>{try{event.currentTarget.showPicker();}catch{event.currentTarget.focus();}}}/></span>;}
