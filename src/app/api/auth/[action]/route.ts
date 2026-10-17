import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/lib/http";
import { createHash } from "node:crypto";
import {tokenHash} from "@/lib/account-security";
import { audit } from "@/lib/audit";
const credentials = z.object({
  email: z.email("יש להזין כתובת אימייל תקינה.").max(254).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, "יש להזין סיסמה.").max(128),
  verificationToken:z.string().min(32).max(128).optional(),
  name: z.string().trim().min(1).max(80).optional()
});
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const isForm = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded');
  let trustedOrigin = request.headers.get('origin') ?? new URL(request.url).origin;
  try {
    checkOrigin(request);
    if (action === "logout") { await deleteSession(); return NextResponse.json({ ok: true },{headers:{"Clear-Site-Data":'"cache", "storage"'}}); }
    if (action !== "login" && action !== "register") throw new HttpError(404, "לא נמצא.");
    const input = credentials.parse(isForm ? Object.fromEntries(new URLSearchParams(await request.text())) : await jsonBody(request));
    if (action === 'register' && input.password.length < 12) throw new HttpError(400, 'הסיסמה צריכה להכיל לפחות 12 תווים.');
    const key = createHash("sha256").update(input.email).digest("hex");
    // Database-backed fixed window; do not rely on a process-local counter.
    await db.loginAttempt.deleteMany({ where: { key, windowStart: { lt: new Date(Date.now() - 15 * 60000) } } });
    const attempts = await db.loginAttempt.upsert({ where: { key }, create: { key }, update: { count: { increment: 1 } } });
    if (attempts.count > 10) throw new HttpError(429, "יותר מדי ניסיונות. אפשר לנסות שוב בעוד 15 דקות.");
    let user = await db.user.findUnique({ where: { email: input.email } });
    if (action === "register") {
      if (user) throw new HttpError(400, "לא ניתן ליצור חשבון עם הפרטים האלה. אפשר לנסות להתחבר.");
      if (!input.name) throw new HttpError(400, "יש להזין שם.");
      if(!input.verificationToken)throw new HttpError(403,'ההרשמה ל־SBO אפשרית באמצעות הזמנה ואימות מייל בלבד.');
      const passwordHash=await hashPassword(input.password);
      user=await db.$transaction(async tx=>{
        const verification=await tx.accountToken.findUnique({where:{tokenHash:tokenHash(input.verificationToken!)}});
        if(!verification||verification.purpose!=='registration'||verification.usedAt||verification.expiresAt<=new Date()||verification.email!==input.email||!verification.invitationId)throw new HttpError(403,'האימות אינו תקין או שפג תוקפו.');
        const invite=await tx.invitation.updateMany({where:{id:verification.invitationId,email:input.email,usedAt:null,revokedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
        if(!invite.count)throw new HttpError(409,'ההזמנה אינה פעילה. יש לבקש הזמנה חדשה.');
        const used=await tx.accountToken.updateMany({where:{id:verification.id,usedAt:null},data:{usedAt:new Date()}});if(!used.count)throw new HttpError(409,'האימות כבר נוצל.');
        return tx.user.create({data:{email:input.email,name:input.name!,passwordHash,emailVerifiedAt:new Date(),settings:{create:{onboardingStatus:'pending',modulePreferencesInitialized:true,enabledModules:[]}}}});
      });
    } else {
      // Perform a password derivation even when the account does not exist.
      const valid = await verifyPassword(input.password, user?.passwordHash ?? "00000000000000000000000000000000:" + "00".repeat(64));
      if (!user || !valid) throw new HttpError(401, "האימייל או הסיסמה שגויים.");
    }
    if(user!.status!=='active')throw new HttpError(403,user!.status==='pending_deletion'?'החשבון בתהליך מחיקה. אפשר לבטל בתוך 30 יום במסך שחזור החשבון.':'החשבון אינו פעיל.');
    await createSession(user!.id,request.headers.get('user-agent')??'');
    await audit({userId:user!.id,action:action==='register'?'ACCOUNT_REGISTERED':'LOGIN_SUCCESS',entityType:'ACCOUNT'});
    if (isForm) return NextResponse.redirect(new URL('/', trustedOrigin), 303);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = apiError(error);
    if (isForm) {
      const target = new URL('/login', trustedOrigin);
      if (action === 'register') target.searchParams.set('mode', 'register');
      target.searchParams.set('error', (await response.json()).error);
      return NextResponse.redirect(target, 303);
    }
    return response;
  }
}
