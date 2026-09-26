"use client";
import {useEffect,useState} from 'react';
export default function ModuleLoading(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),180);return()=>clearTimeout(timer);},[]);
  return <div className={`sbo-loading${visible?' is-visible':''}`} role="status" aria-label="SBO — טעינת המסך"><div className="sbo-loading-scene" aria-hidden="true"><div className="sbo-orbit-track"/><strong className="sbo-loading-logo">SBO</strong><div className="sbo-orbit-hero"><svg viewBox="0 0 100 40"><path className="hero-trail" d="M2 28 Q24 30 49 19"/><path className="hero-cape" d="M58 13 Q32 3 13 24 Q32 19 43 27Z"/><path d="M56 14 71 12 92 7 96 11 74 18 61 24 43 28 27 35 24 31 41 20Z"/><circle cx="70" cy="7" r="6"/></svg></div></div></div>;
}
