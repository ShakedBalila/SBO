import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {apiError,checkOrigin,HttpError,jsonBody} from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);const user=await currentUser();if(!user)throw new HttpError(401,'יש להתחבר לחשבון.');const {status}=z.object({status:z.enum(['profile','water','nutrition','vehicle','work','complete'])}).strict().parse(await jsonBody(request));await db.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,onboardingStatus:status},update:{onboardingStatus:status}});return NextResponse.json({ok:true});}catch(error){return apiError(error);}}
