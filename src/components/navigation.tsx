"use client";
import {TransitionLink as Link} from "@/components/transition-link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, CalendarDays, CarFront, Utensils, BriefcaseBusiness, LogOut, ArrowUpRight, Dumbbell, Menu, Settings, Database, Bell, CircleHelp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WaterBottleIcon } from "@/components/water-bottle-icon";
import {MODULES,orderedModules,navigationCapacity} from '@/lib/module-preferences';
import {leaveAccount} from './account-client';
const links = [
  { href: "/", label: "סקירה", mobileLabel:"סקירה", Icon: LayoutGrid },
  { href: "/tasks", label: "זמן ומשימות", mobileLabel:"משימות", Icon: CalendarDays },
  { href: "/water", label: "צריכת מים יומית", mobileLabel:"מים", Icon: WaterBottleIcon },
  { href: "/nutrition", label: "תזונה", mobileLabel:"תזונה", Icon: Utensils },
  { href: "/car", label: "רכב", mobileLabel:"רכב", Icon: CarFront },
  { href: "/workouts", label: "אימונים", mobileLabel:"אימונים", Icon: Dumbbell },
  { href: "/work", label: "עבודה", mobileLabel:"עבודה", Icon: BriefcaseBusiness }
];
const secondaryLinks=[
  {href:'/settings',label:'הגדרות',Icon:Settings},
  {href:'/data',label:'ייצוא וגיבוי',Icon:Database},
  {href:'/notifications',label:'התראות',Icon:Bell},
  {href:'/help',label:'עזרה',Icon:CircleHelp}
];
export function Navigation({ name,enabled,order }: { name: string;enabled:string[];order:string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drawer=useRef<HTMLDialogElement>(null),bar=useRef<HTMLElement>(null),[capacity,setCapacity]=useState(0);
  const ordered=orderedModules(order).map(id=>links.find(l=>l.href===`/${id}`)!).filter(Boolean),visible=ordered.filter(l=>enabled.includes(l.href.slice(1))),hidden=ordered.filter(l=>!enabled.includes(l.href.slice(1))),mainLinks=[links[0],...visible];
  useEffect(()=>{const element=bar.current;if(!element)return;const measure=()=>{const style=getComputedStyle(element),usable=element.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),font=parseFloat(getComputedStyle(element.querySelector('span')??element).fontSize);setCapacity(navigationCapacity(usable,Math.max(60,font*5.2)));};const observer=new ResizeObserver(measure);observer.observe(element);window.addEventListener('sbo-display-change',measure);measure();return()=>{observer.disconnect();window.removeEventListener('sbo-display-change',measure);};},[]);
  const active=(href:string)=>href==='/'?pathname==='/':pathname===href||pathname.startsWith(`${href}/`);
  async function logout() {
    setBusy(true); setError("");
    try {
      await leaveAccount();
    } catch { setError("לא ניתן להתנתק. נסה שוב."); } finally { setBusy(false); }
  }
  return <>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">s</span>SBO<span className="brand-dot">.</span></Link>
      <p className="nav-caption">סביבת העבודה שלך</p>
      <nav aria-label="ניווט ראשי">{mainLinks.map(({ href, label, Icon }) => <Link href={href} key={href} className={`nav-link ${active(href) ? "active" : ""}`} aria-current={active(href) ? "page" : undefined}><Icon size={20}/><span>{label}</span>{active(href) && <span className="nav-dot"/>}</Link>)}</nav>
      <details className="inactive-modules"><summary>מודולים נוספים</summary>{hidden.map(({href,label})=><Link href="/settings/preferences" key={href}>{label}</Link>)}</details><nav className="secondary-nav" aria-label="כלים והגדרות">{secondaryLinks.map(({href,label,Icon})=><Link href={href} key={href} className={`nav-link ${pathname.startsWith(href)?'active':''}`}><Icon size={18}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom"><div className="local-note"><span className="online-dot"/>SBO מחובר<ArrowUpRight size={15}/></div><div className="profile"><div className="avatar">{name.slice(0, 1).toUpperCase()}</div><div><strong>{name}</strong><small>חשבון אישי</small></div><button className="icon-button" aria-label="התנתקות" disabled={busy} onClick={logout}><LogOut size={18}/></button></div>{error && <p role="alert" className="error-text">{error}</p>}</div>
    </aside>
    <header className="mobile-header"><button className="icon-button" aria-label="פתיחת תפריט" onClick={()=>drawer.current?.showModal()}><Menu size={22}/></button><Link href="/" className="brand"><span className="brand-mark">s</span>SBO</Link><Link href="/notifications" className="icon-button" aria-label="התראות"><Bell size={20}/></Link>{error && <p role="alert">{error}</p>}</header>
    <nav ref={bar} className="bottom-nav" aria-label="ניווט בנייד">{[links[0],...visible.slice(0,capacity)].map(({ href, mobileLabel, Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "active" : ""}><Icon width={21} height={21}/><span>{mobileLabel}</span></Link>)}<button onClick={()=>drawer.current?.showModal()} aria-label="עוד מודולים והגדרות"><Menu width={21} height={21}/><span>עוד</span></button></nav>
    <dialog ref={drawer} className="mobile-drawer" onClick={event=>{if(event.target===event.currentTarget)drawer.current?.close();}}><div className="drawer-heading"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><small>החשבון שלי</small></div><button className="icon-button" aria-label="סגירת תפריט" onClick={()=>drawer.current?.close()}><X/></button></div><nav><strong>מודולים פעילים</strong>{visible.map(({href,label,Icon})=><Link href={href} key={href} onClick={()=>drawer.current?.close()}><Icon size={20}/>{label}</Link>)}<Link href="/settings/preferences" onClick={()=>drawer.current?.close()}>מודולים נוספים וניהול הסדר</Link>{secondaryLinks.map(({href,label,Icon})=><Link href={href} key={href} onClick={()=>drawer.current?.close()}><Icon size={20}/><span>{label}</span></Link>)}</nav><button className="drawer-logout" disabled={busy} onClick={logout}><LogOut size={19}/>התנתקות</button></dialog>
  </>;
}
