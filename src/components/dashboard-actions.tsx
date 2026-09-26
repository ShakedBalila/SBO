"use client";
import {TransitionLink as Link} from '@/components/transition-link';
import {Bell,Settings,X} from 'lucide-react';
import {useRef,useState} from 'react';
export function DashboardActions({name}:{name:string}){
 const dialog=useRef<HTMLDialogElement>(null),[view,setView]=useState<'notifications'|'settings'>('notifications'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 function open(next:typeof view){setView(next);setMessage('');dialog.current?.showModal();}
 async function enable(){setBusy(true);setMessage('');try{
  if(!('Notification'in window)||!('PushManager'in window))throw new Error('באייפון יש להוסיף את SBO למסך הבית ולפתוח אותו משם כדי להפעיל התראות.');
  const config=await fetch('/api/push/subscriptions').then(r=>r.json());if(!config.publicKey)throw new Error('שירות ההתראות עדיין אינו מוגדר בשרת.');
  if(await Notification.requestPermission()!=='granted')throw new Error('יש לאפשר התראות בהגדרות המכשיר.');
  const registration=await navigator.serviceWorker.ready;
  const raw=atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),key=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  const response=await fetch('/api/push/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription.toJSON())});if(!response.ok)throw new Error('לא ניתן לשמור את הגדרות ההתראות.');setMessage('המכשיר מחובר להתראות SBO.');
 }catch(e){setMessage(e instanceof Error?e.message:'לא ניתן להפעיל התראות.');}finally{setBusy(false);}}
 return <><div className="dashboard-header-actions"><button className="icon-button" aria-label="התראות" onClick={()=>open('notifications')}><Bell/></button><button className="icon-button" aria-label="הגדרות" onClick={()=>open('settings')}><Settings/></button></div><dialog className="modal dashboard-settings-modal" ref={dialog} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();}}}><div className="modal-heading"><h2>{view==='settings'?'הגדרות':'התראות SBO'}</h2><button className="icon-button" aria-label="סגירה" onClick={()=>dialog.current?.close()}><X/></button></div>{view==='settings'?<><p>{name}</p><div className="dashboard-settings-links"><Link href="/water" onClick={()=>dialog.current?.close()}>יעדי מים ותזכורות</Link><Link href="/nutrition" onClick={()=>dialog.current?.close()}>פרופיל ויעדי תזונה</Link><Link href="/car" onClick={()=>dialog.current?.close()}>רכב והגדרות התראות</Link></div></>:<><p>התראות המשימות, המים והרכב יישלחו למכשיר בהתאם להגדרות שלך בכל תחום.</p>{message&&<p role="status">{message}</p>}<div className="modal-actions"><button className="button secondary" onClick={()=>dialog.current?.close()}>סגירה</button><button className="button primary" disabled={busy} onClick={()=>void enable()}>{busy?'מתחבר…':'הפעלת התראות'}</button></div></>}</dialog></>;
}
