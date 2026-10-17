'use client';
import {useEffect} from 'react';
export function AccountBoundary({userId,textScale,reducedMotion}:{userId:string;textScale:number;reducedMotion:boolean}){
 useEffect(()=>{
  document.documentElement.style.setProperty('--user-text-scale',String(textScale/100));document.documentElement.dataset.reduceMotion=String(reducedMotion);document.documentElement.dataset.textScale=String(textScale);window.dispatchEvent(new Event('sbo-display-change'));
  const controller=new AbortController();let checking=false;const channel='BroadcastChannel'in window?new BroadcastChannel('sbo-account'):null;if(channel)channel.onmessage=()=>{document.querySelector('.workspace')?.replaceChildren();location.replace('/login');};
  async function check(){if(checking||document.visibilityState==='hidden')return;checking=true;try{const response=await fetch('/api/session-check',{cache:'no-store',signal:controller.signal});if(response.status===401||response.ok&&(await response.json()).userId!==userId){document.querySelector('.workspace')?.replaceChildren();location.replace('/login');}}catch{}finally{checking=false;}}
  const show=(e:PageTransitionEvent)=>{if(e.persisted){document.querySelector('.workspace')?.replaceChildren();location.reload();}else void check();};
  window.addEventListener('pageshow',show);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);const timer=setInterval(check,30000);
  return()=>{channel?.close();controller.abort();clearInterval(timer);window.removeEventListener('pageshow',show);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
 },[userId,textScale,reducedMotion]);return null;
}
