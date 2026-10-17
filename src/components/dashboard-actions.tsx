'use client';
import Link from 'next/link';
import {Bell,Settings,X} from 'lucide-react';
import {useRef,useState} from 'react';
import {NotificationsWorkspace} from './notifications-workspace';
export function DashboardActions({name}:{name:string}){
 const dialog=useRef<HTMLDialogElement>(null),[opened,setOpened]=useState(false);
 return <><div className="dashboard-header-actions"><button className="icon-button" aria-label="ניהול התראות" onClick={()=>{setOpened(true);dialog.current?.showModal();}}><Bell/></button><Link className="icon-button" aria-label={`הגדרות ${name}`} href="/settings"><Settings/></Link></div><dialog ref={dialog} className="modal notification-console" onClose={()=>setOpened(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.current?.close();}}}><button className="icon-button v6-close" aria-label="סגירה" onClick={()=>dialog.current?.close()}><X/></button>{opened&&<NotificationsWorkspace/>}</dialog></>;
}
