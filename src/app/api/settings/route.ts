import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {apiError,checkOrigin,HttpError,jsonBody} from '@/lib/http';
const input=z.object({name:z.string().trim().min(2,'יש להזין שם.').max(100),timezone:z.string().trim().min(1).max(80),currency:z.enum(['ILS','USD','EUR'])}).strict();
export async function POST(request:Request){try{checkOrigin(request);const user=await currentUser();if(!user)throw new HttpError(401,'יש להתחבר מחדש.');const data=input.parse(await jsonBody(request));try{new Intl.DateTimeFormat('he-IL',{timeZone:data.timezone}).format();}catch{throw new HttpError(400,'אזור הזמן אינו תקין.');}await db.$transaction([db.user.update({where:{id:user.id},data:{name:data.name}}),db.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,timezone:data.timezone,currency:data.currency},update:{timezone:data.timezone,currency:data.currency}})]);return NextResponse.json({ok:true});}catch(error){return apiError(error);}}
