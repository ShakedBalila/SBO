import Link from 'next/link';
import {WifiOff,RotateCcw} from 'lucide-react';
export default function OfflinePage(){return <main className="offline-page" dir="rtl"><WifiOff/><h1>אין כרגע חיבור לאינטרנט</h1><p>המידע שכבר פתוח במכשיר נשאר זמין. התחבר מחדש כדי לשמור שינויים ולקבל נתונים עדכניים.</p><Link href="/"><RotateCcw size={17}/>ניסיון חיבור מחדש</Link></main>;}
