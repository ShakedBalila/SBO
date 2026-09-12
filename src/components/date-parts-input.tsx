"use client";

import { useEffect, useState } from "react";

type Props={value:string|null;onChange:(value:string|null)=>void;required?:boolean;min?:string|null};

function displayDate(value:string|null){
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return "";
  const [year,month,day]=value.split("-");
  return `${day}/${month}/${year}`;
}

function isoDate(value:string){
  const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!match)return null;
  const [,day,month,year]=match,candidate=`${year}-${month}-${day}`;
  const date=new Date(`${candidate}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===candidate?candidate:null;
}

function maskDate(value:string){
  const digits=value.replace(/\D/g,"").slice(0,8);
  return [digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join("/");
}

export function DatePartsInput({value,onChange,required=false,min=null}:Props){
  const [text,setText]=useState(()=>displayDate(value));
  useEffect(()=>setText(displayDate(value)),[value]);
  return <input className="israeli-date-input" dir="ltr" inputMode="numeric" autoComplete="off" aria-label="תאריך במבנה יום חודש שנה" placeholder="יום/חודש/שנה" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" required={required} value={text}
    onChange={event=>{const next=maskDate(event.target.value);setText(next);event.target.setCustomValidity("");if(!next){onChange(null);return;}const iso=isoDate(next);if(iso&&(!min||iso>=min))onChange(iso);}}
    onBlur={event=>{if(!text){event.currentTarget.setCustomValidity(required?"יש להזין תאריך.":"");return;}const iso=isoDate(text);const message=!iso?"יש להזין תאריך תקין במבנה יום/חודש/שנה.":min&&iso<min?"התאריך חייב להיות מאוחר יותר מתאריך ההתחלה.":"";event.currentTarget.setCustomValidity(message);if(message)event.currentTarget.reportValidity();}}
  />;
}
