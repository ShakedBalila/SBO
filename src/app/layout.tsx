import type { Metadata } from "next";
import "./globals.css";
import "./dark.css";
import "./modules.css";
import "./calendar.css";
import { PwaRegister } from '@/components/pwa-register';
export const metadata: Metadata = { title: "SBO · סביבת העבודה שלך", description: "הדאשבורד האישי שלך למשימות, מים, רכב ותזונה.", icons: { icon: "/favicon.svg", apple:'/favicon.svg' }, manifest:'/manifest.webmanifest', appleWebApp:{capable:true,title:'SBO',statusBarStyle:'black-translucent'} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body><PwaRegister/>{children}</body></html>;
}
