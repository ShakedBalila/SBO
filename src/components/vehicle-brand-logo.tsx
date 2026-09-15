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
