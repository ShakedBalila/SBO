import {NextResponse} from 'next/server';
import {z} from 'zod';
import webpush from 'web-push';
import {db} from '@/lib/db';
import {accountSession,accountLimit} from '@/lib/account-security';
import {apiError,checkOrigin,jsonBody,HttpError} from '@/lib/http';
import {pushAllowed} from '@/lib/push-access';
export async function POST(request:Request){try{
 checkOrigin(request);const session=await accountSession();await accountLimit(`push-test:${session.userId}`,4);const {endpoint}=z.object({endpoint:z.string().url()}).strict().parse(await jsonBody(request));
 const sub=await db.pushSubscription.findFirst({where:{userId:session.userId,sessionId:session.id,endpoint,enabled:true}});if(!sub||!await pushAllowed(sub.id,true))throw new HttpError(400,'יש לחבר את המכשיר הנוכחי להתראות.');
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY;if(!publicKey||!privateKey)throw new HttpError(503,'שירות ההתראות לא מחובר.');
 webpush.setVapidDetails('mailto:sbo.notifications@gmail.com',publicKey,privateKey);
 await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:'SBO · בדיקת התראות',body:'אם ראית את ההודעה, ההתראות פועלות במכשיר הזה.',url:'/notifications',tag:'sbo-test',sessionId:session.id,manualTest:true}),{TTL:60,timeout:10000});
 return NextResponse.json({ok:true,message:'ספק ההתראות קיבל את הבקשה. בדוק שההודעה הופיעה במכשיר.'});
}catch(error){return apiError(error);}}
