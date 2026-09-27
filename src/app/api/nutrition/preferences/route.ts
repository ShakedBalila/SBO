import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError, checkOrigin, HttpError, jsonBody } from '@/lib/http';

const input=z.object({foodKey:z.string().trim().min(3).max(160),favorite:z.boolean()}).strict();
export async function POST(request:Request){
  try{checkOrigin(request);const user=await currentUser();if(!user)throw new HttpError(401,'יש להתחבר מחדש.');const data=input.parse(await jsonBody(request));await db.foodPreference.upsert({where:{userId_foodKey:{userId:user.id,foodKey:data.foodKey}},create:{userId:user.id,...data},update:{favorite:data.favorite}});return NextResponse.json({ok:true});}catch(error){return apiError(error);}
}
