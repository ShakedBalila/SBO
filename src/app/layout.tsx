import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./dark.css";
import "./modules.css";
import "./calendar.css";
import "./theme.css";
import { PwaRegister } from '@/components/pwa-register';
export const metadata: Metadata = {
  title: "SBO · סביבת העבודה שלך",
  description: "הדאשבורד האישי שלך למשימות, צריכת מים יומית, רכב ותזונה.",
  icons: {
    icon: [
      { url: "/sbo-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/sbo-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/sbo-icon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SBO", statusBarStyle: "black-translucent" },
};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#031522"};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body><PwaRegister/>{children}</body></html>;
}
