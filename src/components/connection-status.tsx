'use client';
import {useEffect,useState} from 'react';
import {WifiOff} from 'lucide-react';
export function ConnectionStatus(){const [offline,setOffline]=useState(false);useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);return offline?<div className="offline-banner" role="status"><WifiOff size={16}/>אין חיבור לאינטרנט. אפשר לעיין במידע שכבר נטען; שמירה תחזור כשהחיבור יתחדש.</div>:null;}
