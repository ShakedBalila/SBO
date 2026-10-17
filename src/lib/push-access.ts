import {db} from './db';
export async function pushAllowed(id:string,manualTest=false,scheduledAt?:Date){
 const sub=await db.pushSubscription.findUnique({where:{id},include:{user:{select:{status:true,settings:{select:{notificationsEnabled:true,notificationsResumedAt:true}}}}}});
 if(!sub?.enabled||!sub.sessionId||sub.user.status!=='active'||(!manualTest&&!sub.user.settings?.notificationsEnabled))return false;
 if(!manualTest&&scheduledAt&&[sub.connectedAt,sub.user.settings?.notificationsResumedAt].some(date=>date&&scheduledAt<date))return false;
 return Boolean(await db.session.findFirst({where:{id:sub.sessionId,userId:sub.userId,expiresAt:{gt:new Date()}},select:{id:true}}));
}
