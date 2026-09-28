"use client";

import { useState } from "react";
import { CarFront } from "lucide-react";

const brands: Array<[string[], string]> = [
  [["mazda", "מאזדה"], "mazda.com"], [["toyota", "טויוטה"], "toyota.com"],
  [["hyundai", "יונדאי"], "hyundai.com"], [["kia", "קיה"], "kia.com"],
  [["honda", "הונדה"], "honda.com"], [["nissan", "ניסאן"], "nissan-global.com"],
  [["suzuki", "סוזוקי"], "globalsuzuki.com"], [["mitsubishi", "מיצובישי"], "mitsubishi-motors.com"],
  [["subaru", "סובארו"], "subaru.com"], [["skoda", "סקודה"], "skoda-auto.com"],
  [["volkswagen", "פולקסווגן"], "volkswagen.com"], [["seat", "סיאט"], "seat.com"],
  [["cupra", "קופרה"], "cupraofficial.com"], [["ford", "פורד"], "ford.com"],
  [["chevrolet", "שברולט"], "chevrolet.com"], [["renault", "רנו"], "renault.com"],
  [["peugeot", "פיג'ו", "פיג׳ו"], "peugeot.com"], [["citroen", "סיטרואן"], "citroen.com"],
  [["bmw"], "bmw.com"], [["mercedes", "מרצדס"], "mercedes-benz.com"],
  [["audi", "אאודי"], "audi.com"], [["volvo", "וולוו"], "volvocars.com"],
  [["tesla", "טסלה"], "tesla.com"], [["byd"], "byd.com"], [["geely", "ג'ילי", "ג׳ילי"], "geely.com"],
];

export function vehicleBrandDomain(name: string) {
  const normalized = name.trim().toLowerCase();
  return brands.find(([aliases]) => aliases.some(alias => normalized.includes(alias)))?.[1] ?? null;
}

export function VehicleBrandLogo({ name }: { name: string }) {
  const [loaded, setLoaded] = useState(false),[failed,setFailed]=useState(false);
  const domain = vehicleBrandDomain(name);
  const wordmark=domain?.split('.')[0].toUpperCase();
  return <span className={`vehicle-logo ${!loaded?'fallback':''}`}>{wordmark?<span className="vehicle-logo-word">{wordmark}</span>:<CarFront aria-hidden="true"/>}{domain&&!failed&&<img className={loaded?'loaded':''} src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt={`סמל ${name}`} onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>}</span>;
}

export function VehicleVisual({name}:{name:string}){
  const normalized=name.toLowerCase();
  const isMazda=normalized.includes('mazda')||normalized.includes('מאזדה');
  const type=/suv|ג׳יפ|ג'יפ|קרוס|rav4|tucson|sportage|qashqai/.test(normalized)?'suv':/mini|פיקנטו|i10|swift|yaris/.test(normalized)?'compact':/tesla|byd|electric|חשמלי/.test(normalized)?'electric':'sedan';
  const body=type==='suv'?'M12 54 21 31Q25 23 38 22h48q12 1 19 14l9 18z':type==='compact'?'M14 54 26 32q6-9 19-9h30q13 0 22 14l7 13z':type==='electric'?'M10 54 27 30q7-9 19-9h31q16 0 27 19l8 10z':'M11 54 29 34q7-9 20-9h27q14 0 28 19l11 10z';
  return <div className={`vehicle-visual ${type} ${isMazda?'photo':''}`} aria-label={`המחשה של ${name||'הרכב'}`}>{isMazda?<img src="/mazda-3-black.png" alt={`מאזדה שחורה — ${name}`}/>:<svg viewBox="0 0 128 72" role="img"><path className="car-shadow" d="M10 61h108"/><path className="car-body" d={body}/><path className="car-window" d="M43 33h34q11 1 19 14H31q5-10 12-14Z"/><circle cx="35" cy="56" r="9"/><circle cx="96" cy="56" r="9"/><circle className="hub" cx="35" cy="56" r="4"/><circle className="hub" cx="96" cy="56" r="4"/></svg>}<VehicleBrandLogo name={name}/></div>;
}
