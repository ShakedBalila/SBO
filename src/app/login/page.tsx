import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
export default async function Login({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if (await currentUser()) redirect("/");
  const params = await searchParams;
  return <main className="auth-page"><section className="auth-story"><div className="brand"><span className="brand-mark">s</span>SBO.</div><div className="auth-modules"><span>✓ משימות</span><span>◉ צריכת מים יומית</span><span>↗ רכב</span><span>◌ תזונה</span></div></section><section className="auth-form-wrap"><AuthForm register={params.mode === "register"} error={params.error}/></section></main>;
}
