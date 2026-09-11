import { NextResponse } from "next/server";
import { z } from "zod";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  const protocol = (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")).split(",")[0].trim();
  const sameOrigin = host ? `${protocol}://${host}` : "";
  const allowed = (process.env.APP_ORIGINS ?? "").split(",").map(x => x.trim()).filter(Boolean);
  if (process.env.VERCEL_URL) allowed.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) allowed.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (!origin || (origin !== sameOrigin && !allowed.includes(origin))) throw new HttpError(403, "הבקשה הגיעה מכתובת שאינה מורשית.");
}
export async function jsonBody(request: Request) {
  const body = await request.text();
  if (body.length > 20000) throw new HttpError(413, "הטופס שנשלח גדול מדי.");
  try { return JSON.parse(body); } catch { throw new HttpError(400, "נתוני הטופס אינם תקינים."); }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "יש לבדוק את פרטי הטופס." }, { status: 400 });
  console.error("SBO request failed", error instanceof Error ? error.name : "Unknown error", error && typeof error === 'object' && 'code' in error ? error.code : '');
  return NextResponse.json({ error: "SBO לא הצליח לשמור או לטעון את הנתונים. יש לבדוק את החיבור ולנסות שוב." }, { status: 503 });
}
