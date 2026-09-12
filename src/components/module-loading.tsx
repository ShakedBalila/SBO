"use client";

import { usePathname } from "next/navigation";
import { CarFront, CheckCheck, Droplets, Utensils } from "lucide-react";

const views={
  tasks:{label:"פותח את ניהול הזמן והמשימות",Icon:CheckCheck},
  water:{label:"פותח את מעקב המים",Icon:Droplets},
  car:{label:"פותח את ניהול הרכב",Icon:CarFront},
  nutrition:{label:"פותח את מעקב התזונה",Icon:Utensils}
};

export default function ModuleLoading(){
  const pathname=usePathname(),key=pathname.split("/")[1] as keyof typeof views;
  const view=views[key]??{label:"SBO נטען",Icon:CheckCheck};
  const Icon=view.Icon;
  return <div className={`module-loading loading-${key||"home"}`} role="status" aria-live="polite"><div className="loading-scene"><span className="loading-orbit"/><Icon/></div><strong>{view.label}</strong><span className="loading-dots"><i/><i/><i/></span></div>;
}
