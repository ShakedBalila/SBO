import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {apiError,checkOrigin,HttpError,jsonBody} from '@/lib/http';
import {accountLimit,secretToken,tokenHash} from '@/lib/account-security';
import {sendAccountMail,mailConfigured} from '@/lib/account-mail';
export async function POST(request:Request){try{
 checkOrigin(request);const value=z.object({token:z.string().min(32).max(128),action:z.enum(['inspect','verify'])}).strict().parse(await jsonBody(request));
 const invitation=await db.invitation.findUnique({where:{tokenHash:tokenHash(value.token)}});
 if(!invitation||invitation.usedAt||invitation.revokedAt||invitation.expiresAt<=new Date())throw new HttpError(400,'ההזמנה אינה פעילה. יש לבקש מהאדמין הזמנה חדשה.');
 if(value.action==='inspect')return NextResponse.json({emailHint:invitation.email.replace(/^(.).+(@.+)$/,'$1…$2'),expiresAt:invitation.expiresAt,mailConfigured:mailConfigured(),googleConfigured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)},{headers:{'Cache-Control':'no-store'}});
 await accountLimit(`invite-verify:${invitation.id}`,4);if(!mailConfigured())throw new HttpError(503,'אימות המייל עדיין לא מחובר. ההרשמה תתאפשר לאחר חיבור האימות.');
 const raw=secretToken();await db.accountToken.create({data:{email:invitation.email,invitationId:invitation.id,purpose:'registration',tokenHash:tokenHash(raw),expiresAt:new Date(Math.min(invitation.expiresAt.valueOf(),Date.now()+30*60000))}});
 await sendAccountMail(invitation.email,'אימות ההזמנה שלך','השלמת הצטרפות ל־SBO עבור כתובת המייל שהוזמנה. קישור זה תקף ל־30 דקות.',`/account-action#registration=${raw}`);return NextResponse.json({ok:true,message:'בקשת האימות התקבלה אצל ספק המייל.'});
}catch(error){return apiError(error);}}
