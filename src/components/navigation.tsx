"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, CheckCheck, Droplets, CarFront, Utensils, LogOut, ArrowUpRight } from "lucide-react";
import { useState } from "react";
const links = [
  { href: "/", label: "סקירה", Icon: LayoutGrid },
  { href: "/tasks", label: "זמן ומשימות", Icon: CheckCheck },
  { href: "/water", label: "מים", Icon: Droplets },
  { href: "/car", label: "רכב", Icon: CarFront },
  { href: "/nutrition", label: "תזונה", Icon: Utensils }
];
export function Navigation({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
      <nav aria-label="ניווט ראשי">{links.map(({ href, label, Icon }) => <Link href={href} key={href} className={`nav-link ${pathname === href ? "active" : ""}`} aria-current={pathname === href ? "page" : undefined}><Icon size={20}/>{label}{pathname === href && <span className="nav-dot"/>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="local-note"><span className="online-dot"/>SBO מחובר<ArrowUpRight size={15}/></div><div className="profile"><div className="avatar">{name.slice(0, 1).toUpperCase()}</div><div><strong>{name}</strong><small>חשבון אישי</small></div><button className="icon-button" aria-label="התנתקות" disabled={busy} onClick={logout}><LogOut size={18}/></button></div>{error && <p role="alert" className="error-text">{error}</p>}</div>
    </aside>
    <header className="mobile-header"><Link href="/" className="brand"><span className="brand-mark">s</span>SBO.</Link><button className="icon-button" aria-label="התנתקות" disabled={busy} onClick={logout}><LogOut size={20}/></button>{error && <p role="alert">{error}</p>}</header>
    <nav className="bottom-nav" aria-label="ניווט בנייד">{links.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "active" : ""}><Icon size={21}/><span>{label}</span></Link>)}</nav>
  </>;
}
