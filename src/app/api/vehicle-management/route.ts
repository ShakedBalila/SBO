import {z} from 'zod';
import {accountSession} from '@/lib/account-security';
import {changeVehicle} from '@/lib/vehicle-management';
import {checkOrigin,jsonBody,apiError} from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);const {userId}=await accountSession(),body=z.object({id:z.string(),action:z.enum(['primary','archive','restore'])}).strict().parse(await jsonBody(request));await changeVehicle(userId,body.id,body.action);return Response.json({ok:true});}catch(error){return apiError(error);}}
