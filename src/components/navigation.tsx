"use client";
import {TransitionLink as Link} from "@/components/transition-link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, CalendarDays, CarFront, Utensils, LogOut, ArrowUpRight, Menu, Settings, Database, Bell, CircleHelp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WaterBottleIcon } from "@/components/water-bottle-icon";
const links = [
  { href: "/", label: "סקירה", mobileLabel:"ראשי", Icon: LayoutGrid },
  { href: "/tasks", label: "זמן ומשימות", mobileLabel:"משימות", Icon: CalendarDays },
  { href: "/water", label: "צריכת מים יומית", mobileLabel:"מים", Icon: WaterBottleIcon },
  { href: "/nutrition", label: "תזונה", mobileLabel:"תזונה", Icon: Utensils },
  { href: "/car", label: "רכב", mobileLabel:"רכב", Icon: CarFront }
];
const secondaryLinks=[
  {href:'/settings',label:'הגדרות',Icon:Settings},
  {href:'/data',label:'גיבוי ונתונים',Icon:Database},
  {href:'/notifications',label:'התראות',Icon:Bell},
  {href:'/help',label:'עזרה',Icon:CircleHelp}
];
export function Navigation({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(()=>{
    const viewport=window.visualViewport;
    const update=()=>document.documentElement.style.setProperty('--sbo-viewport-bottom',String(viewport?viewport.offsetTop+viewport.height:window.innerHeight)+'px');
    update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);
    return ()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);document.documentElement.style.removeProperty('--sbo-viewport-bottom');};
  },[]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drawer=useRef<HTMLDialogElement>(null);
  const active=(href:string)=>href==='/'?pathname==='/':pathname===href||pathname.startsWith(`${href}/`);
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("לא ניתן להתנתק. נסה שוב.");
      router.push("/login"); router.refresh();
    } catch { setError("לא ניתן להתנתק. נסה שוב."); } finally { setBusy(false); }
  }
  return <>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">s</span>SBO<span className="brand-dot">.</span></Link>
      <p className="nav-caption">סביבת העבודה שלך</p>
      <nav aria-label="ניווט ראשי">{links.map(({ href, label, Icon }) => <Link href={href} key={href} className={`nav-link ${active(href) ? "active" : ""}`} aria-current={active(href) ? "page" : undefined}><Icon size={20}/>{label}{active(href) && <span className="nav-dot"/>}</Link>)}</nav>
      <nav className="secondary-nav" aria-label="כלים והגדרות">{secondaryLinks.map(({href,label,Icon})=><Link href={href} key={href} className={`nav-link ${pathname.startsWith(href)?'active':''}`}><Icon size={18}/>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="local-note"><span className="online-dot"/>SBO מחובר<ArrowUpRight size={15}/></div><div className="profile"><div className="avatar">{name.slice(0, 1).toUpperCase()}</div><div><strong>{name}</strong><small>חשבון אישי</small></div><button className="icon-button" aria-label="התנתקות" disabled={busy} onClick={logout}><LogOut size={18}/></button></div>{error && <p role="alert" className="error-text">{error}</p>}</div>
    </aside>
    <header className="mobile-header"><button className="icon-button" aria-label="פתיחת תפריט" onClick={()=>drawer.current?.showModal()}><Menu size={22}/></button><Link href="/" className="brand"><span className="brand-mark">s</span>SBO</Link><Link href="/notifications" className="icon-button" aria-label="התראות"><Bell size={20}/></Link>{error && <p role="alert">{error}</p>}</header>
    <nav className="bottom-nav" aria-label="ניווט בנייד">{links.map(({ href, mobileLabel, Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "active" : ""}><Icon width={21} height={21}/><span>{mobileLabel}</span></Link>)}</nav>
    <dialog ref={drawer} className="mobile-drawer" onClick={event=>{if(event.target===event.currentTarget)drawer.current?.close();}}><div className="drawer-heading"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><small>החשבון שלי</small></div><button className="icon-button" aria-label="סגירת תפריט" onClick={()=>drawer.current?.close()}><X/></button></div><nav>{secondaryLinks.map(({href,label,Icon})=><Link href={href} key={href} onClick={()=>drawer.current?.close()}><Icon size={20}/><span>{label}</span></Link>)}</nav><button className="drawer-logout" disabled={busy} onClick={logout}><LogOut size={19}/>התנתקות</button></dialog>
  </>;
}
