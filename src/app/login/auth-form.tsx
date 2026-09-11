import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Native forms work before JavaScript loads, including on slow LAN connections.
export function AuthForm({ register, error }: { register: boolean; error?: string }) {
  return <div className="auth-form">
    <span className="eyebrow">סביבת העבודה האישית שלך</span>
    <h2>{register ? "מתחילים מחדש." : "טוב שחזרת."}</h2>
    <p>{register ? "צור חשבון והפוך את SBO לשלך." : "התחבר והמשך בדיוק מהמקום שבו עצרת."}</p>
    <form action={`/api/auth/${register ? "register" : "login"}`} method="post">
      {register && <label>שם<input name="name" autoComplete="name" required maxLength={80}/></label>}
      <label>כתובת אימייל<input name="email" type="email" autoComplete="email" autoCapitalize="none" required maxLength={254}/></label>
      <label>סיסמה<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} maxLength={128} required/>
        {register && <small>לפחות 8 תווים.</small>}
      </label>
      {error && <p role="alert" className="error-text">{error}</p>}
      <button className="button primary" type="submit">{register ? "יצירת חשבון" : "התחברות"}<ArrowRight size={18}/></button>
    </form>
    <p className="auth-toggle">{register ? "כבר יש לך חשבון?" : "חדש ב־SBO?"} <Link href={register ? "/login" : "/login?mode=register"}>{register ? "התחברות" : "יצירת חשבון"}</Link></p>
  </div>;
}
