import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { redirect } from "next/navigation";
import { cache } from "react";
export const SESSION_COOKIE = "sbo_session";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export const currentSession = cache(async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: { include: { settings: true } } } });
  if(!session||session.expiresAt<=new Date())return null;
  if(Date.now()-session.lastSeenAt.valueOf()>5*60_000)void db.session.update({where:{id:session.id},data:{lastSeenAt:new Date()}}).catch(()=>{});
  return session;
});
export const currentUser = cache(async function currentUser() { return (await currentSession())?.user??null; });
export async function createSession(userId: string, userAgent="") {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { userId, tokenHash: digest(token), expiresAt, userAgent:userAgent.slice(0,500) } });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV==='production'||process.env.COOKIE_SECURE === "true", path: "/", expires: expiresAt });
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}
export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(SESSION_COOKIE);
}
