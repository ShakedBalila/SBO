import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createHash} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentSession,createSession} from '@/lib/auth';
import {secretToken,tokenHash,appOrigin,reauthenticate,accountLimit} from '@/lib/account-security';
import {checkOrigin,jsonBody,apiError,HttpError} from '@/lib/http';
import {audit} from '@/lib/audit';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:600};
function config(){const clientId=process.env.GOOGLE_CLIENT_ID,secret=process.env.GOOGLE_CLIENT_SECRET;if(!clientId||!secret)throw new HttpError(503,'הכניסה דרך Google עדיין לא חוברה.');return {clientId,secret,redirectUri:`${appOrigin()}/api/auth/google`};}
export async function POST(request:Request){try{
 checkOrigin(request);const cfg=config(),body=z.object({invitationToken:z.string().min(32).max(128).optional(),link:z.boolean().default(false),password:z.string().max(128).optional()}).strict().parse(await jsonBody(request));
 const session=await currentSession();
 if(body.link){if(!session)throw new HttpError(401,'יש להתחבר.');const linked=await db.accountIdentity.findUnique({where:{userId_provider:{userId:session.userId,provider:'google'}}});if(!linked)await reauthenticate(session.user,body.password??'');}
 if(body.invitationToken){const invite=await db.invitation.findUnique({where:{tokenHash:tokenHash(body.invitationToken)}});if(!invite||invite.usedAt||invite.revokedAt||invite.expiresAt<=new Date())throw new HttpError(403,'ההזמנה אינה פעילה.');await accountLimit(`google-invite:${invite.id}`);}
 const state=secretToken(),browser=secretToken(),verifier=secretToken(),nonce=secretToken();
 await db.oAuthAttempt.deleteMany({where:{expiresAt:{lt:new Date()}}});
 await db.oAuthAttempt.create({data:{stateHash:tokenHash(state),browserHash:tokenHash(browser),verifier,nonce,userId:body.link?session!.userId:null,invitationHash:body.invitationToken?tokenHash(body.invitationToken):null,expiresAt:new Date(Date.now()+600000)}});
 (await cookies()).set('sbo_oauth',browser,cookieOptions);
 const params=new URLSearchParams({client_id:cfg.clientId,redirect_uri:cfg.redirectUri,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});
 return NextResponse.json({url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`},{headers:{'Cache-Control':'no-store'}});
}catch(error){return apiError(error);}}
export async function GET(request:Request){try{
 const cfg=config(),url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code'),jar=await cookies(),browser=jar.get('sbo_oauth')?.value;
 if(!state||!code||!browser)throw new HttpError(400,'הכניסה לא הושלמה. יש לנסות שוב.');
 const attempt=await db.oAuthAttempt.findUnique({where:{stateHash:tokenHash(state)}});
 if(!attempt||attempt.expiresAt<=new Date()||attempt.browserHash!==tokenHash(browser))throw new HttpError(400,'בקשת הכניסה פגה.');
 const consumed=await db.oAuthAttempt.deleteMany({where:{id:attempt.id,expiresAt:{gt:new Date()}}});if(!consumed.count)throw new HttpError(409,'בקשת הכניסה נוצלה.');jar.delete('sbo_oauth');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.secret,redirect_uri:cfg.redirectUri,code,code_verifier:attempt.verifier,grant_type:'authorization_code'}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new HttpError(400,'Google לא אישר את הכניסה.');
 const tokens=await response.json();const {payload}=await jwtVerify(tokens.id_token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:cfg.clientId,requiredClaims:['sub','email','email_verified','nonce','exp']});
 if(payload.nonce!==attempt.nonce||payload.email_verified!==true||typeof payload.email!=='string'||typeof payload.sub!=='string')throw new HttpError(403,'Google לא אימת את זהות המייל.');
 const email=payload.email.trim().toLowerCase(),subject=payload.sub;
 let userId:string;
 if(attempt.userId){
  const session=await currentSession();if(!session||session.userId!==attempt.userId)throw new HttpError(403,'יש להתחבר מחדש לפני קישור חשבון.');
  const linked=await db.accountIdentity.findUnique({where:{userId_provider:{userId:session.userId,provider:'google'}}});
  if(linked&&linked.subject!==subject)throw new HttpError(403,'יש לבחור את חשבון Google המקושר.');
  if(!linked){if(email!==session.user.email)throw new HttpError(403,'יש לבחור את כתובת המייל של חשבון SBO שלך.');await db.accountIdentity.create({data:{userId:session.userId,provider:'google',subject}});await db.user.update({where:{id:session.userId},data:{emailVerifiedAt:new Date()}});await audit({userId:session.userId,action:'GOOGLE_LINKED'});}
  const proof=secretToken();await db.accountToken.create({data:{userId:session.userId,email:session.user.email,purpose:'reauth',invitationId:session.id,tokenHash:tokenHash(proof),expiresAt:new Date(Date.now()+5*60000)}});jar.set('sbo_stepup',proof,{...cookieOptions,maxAge:300});return NextResponse.redirect(`${appOrigin()}/settings/account`);
 }else if(attempt.invitationHash){
  userId=await db.$transaction(async tx=>{
   const invite=await tx.invitation.findUnique({where:{tokenHash:attempt.invitationHash!}});
   if(!invite||invite.email!==email||invite.usedAt||invite.revokedAt||invite.expiresAt<=new Date())throw new HttpError(403,'חשבון Google אינו תואם להזמנה פעילה.');
   if(await tx.user.findUnique({where:{email}}))throw new HttpError(409,'החשבון כבר קיים. יש להתחבר בשיטה הקיימת ולקשר Google בהגדרות.');
   const used=await tx.invitation.updateMany({where:{id:invite.id,usedAt:null,revokedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});if(!used.count)throw new HttpError(409,'ההזמנה כבר נוצלה.');
   return (await tx.user.create({data:{email,name:typeof payload.name==='string'?payload.name.slice(0,100):email.split('@')[0],passwordHash:'',emailVerifiedAt:new Date(),identities:{create:{provider:'google',subject}},settings:{create:{onboardingStatus:'pending',modulePreferencesInitialized:true,enabledModules:[]}}}})).id;
  });await audit({userId,action:'ACCOUNT_REGISTERED'});
 }else{
  const identity=await db.accountIdentity.findUnique({where:{provider_subject:{provider:'google',subject}},include:{user:true}});
  if(identity?.user.status==='pending_deletion'&&identity.user.deletionRequestedAt&&Date.now()-identity.user.deletionRequestedAt.valueOf()<30*86400000){const proof=secretToken();await db.accountToken.create({data:{userId:identity.userId,email:identity.user.email,purpose:'recover',tokenHash:tokenHash(proof),expiresAt:new Date(Date.now()+5*60000)}});return NextResponse.redirect(`${appOrigin()}/account-action#recover=${proof}`);}
  if(!identity||identity.user.status!=='active')throw new HttpError(403,'Google אינו מקושר לחשבון פעיל. אפשר להתחבר עם הסיסמה או לקבל הזמנה.');userId=identity.userId;
 }
 await createSession(userId,request.headers.get('user-agent')??'');return NextResponse.redirect(`${appOrigin()}/`);
}catch(error){const message=error instanceof HttpError?error.message:'לא ניתן להשלים את הכניסה דרך Google.';return NextResponse.redirect(`${appOrigin()}/login?error=${encodeURIComponent(message)}`);}}
