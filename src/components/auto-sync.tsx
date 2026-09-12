"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AutoSync(){
  const router=useRouter();
  const [,startTransition]=useTransition();
  useEffect(()=>{
    let lastRefresh=0;
    const refresh=()=>{
      const focused=document.activeElement as HTMLElement|null;
      if(document.visibilityState!=="visible"||document.querySelector("dialog[open]")||focused?.matches("input,textarea,select")||Date.now()-lastRefresh<2500)return;
      lastRefresh=Date.now();
      startTransition(()=>router.refresh());
    };
    const interval=window.setInterval(refresh,7000);
    const visible=()=>{if(document.visibilityState==="visible")refresh();};
    window.addEventListener("focus",refresh);
    window.addEventListener("online",refresh);
    window.addEventListener("pageshow",refresh);
    document.addEventListener("visibilitychange",visible);
    return()=>{window.clearInterval(interval);window.removeEventListener("focus",refresh);window.removeEventListener("online",refresh);window.removeEventListener("pageshow",refresh);document.removeEventListener("visibilitychange",visible);};
  },[router]);
  return null;
}
