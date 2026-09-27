import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError, checkOrigin, HttpError, jsonBody } from '@/lib/http';

const input = z.object({ name:z.string().trim().min(1).max(200), brand:z.string().trim().max(120).default(''), caloriesPer100:z.number().int().min(0).max(10000), proteinPer100G:z.number().min(0).max(1000), carbsPer100G:z.number().min(0).max(1000), fatPer100G:z.number().min(0).max(1000), barcode:z.string().trim().regex(/^$|^\d{8,14}$/).default('') }).strict();
type Context={params:Promise<{id:string}>};

export async function PATCH(request:Request,{params}:Context){
  try{checkOrigin(request);const user=await currentUser();if(!user)throw new HttpError(401,'יש להתחבר מחדש.');const id=(await params).id;const data=input.parse(await jsonBody(request));const result=await db.userFood.updateMany({where:{id,userId:user.id},data});if(!result.count)throw new HttpError(404,'המזון לא נמצא.');return NextResponse.json({ok:true});}catch(error){return apiError(error);}
}
export async function DELETE(request:Request,{params}:Context){
  try{checkOrigin(request);const user=await currentUser();if(!user)throw new HttpError(401,'יש להתחבר מחדש.');const id=(await params).id;const result=await db.userFood.deleteMany({where:{id,userId:user.id}});if(!result.count)throw new HttpError(404,'המזון לא נמצא.');await db.foodPreference.deleteMany({where:{userId:user.id,foodKey:`user:${id}`}});return NextResponse.json({ok:true});}catch(error){return apiError(error);}
}
