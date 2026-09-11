import type { Metadata } from "next";
import "./globals.css";
import "./dark.css";
import "./modules.css";
import "./calendar.css";
export const metadata: Metadata = { title: "SBO · סביבת העבודה שלך", description: "הדאשבורד האישי שלך למשימות, מים, רכב ותזונה.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
