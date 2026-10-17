import {HttpError} from './http';
import {appOrigin} from './account-security';
export const mailConfigured=()=>Boolean(process.env.RESEND_API_KEY&&process.env.SBO_MAIL_FROM);
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function sendAccountMail(email:string,subject:string,message:string,path:string){
 if(!mailConfigured())throw new HttpError(503,'שליחת מיילים עדיין לא מחוברת. לא נשלח מייל.');
 const link=new URL(path,appOrigin()).href;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.SBO_MAIL_FROM,to:[email],subject:`SBO · ${subject}`,text:`SBO\n${message}\n${link}\nאם לא ביקשת פעולה זו, אפשר להתעלם.`,html:`<html lang="he" dir="rtl"><body style="background:#031522;color:#fff;font-family:Arial,sans-serif;padding:24px"><img width="64" height="64" alt="SBO" src="${appOrigin()}/sbo-icon-192.png"><h1>${escape(subject)}</h1><p>${escape(message)}</p><p><a style="background:#eac567;color:#031522;display:inline-block;padding:14px 24px;border-radius:12px" href="${escape(link)}">המשך ל־SBO</a></p><p>אם לא ביקשת פעולה זו, אפשר להתעלם.</p></body></html>`}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new HttpError(503,'ספק המייל לא אישר את הבקשה. יש לנסות שוב מאוחר יותר.');
 return {state:'provider_accepted'} as const;
}
