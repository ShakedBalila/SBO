import {currentSession} from '@/lib/auth';
export async function GET(){const session=await currentSession();return Response.json(session?{userId:session.userId,sessionId:session.id,notificationsEnabled:session.user.settings?.notificationsEnabled??true}:{error:'יש להתחבר מחדש.'},{status:session?200:401,headers:{'Cache-Control':'private, no-store'}});}
