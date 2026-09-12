import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/lib/http";

const subscriptionSchema=z.object({endpoint:z.string().url(),keys:z.object({p256dh:z.string().min(1),auth:z.string().min(1)}).strict()}).strict();

export async function GET(){
  try{const user=await currentUser();if(!user)throw new HttpError(401,"יש להתחבר מחדש.");const count=await db.pushSubscription.count({where:{userId:user.id,enabled:true}});return NextResponse.json({enabled:count>0,publicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY??null});}catch(error){return apiError(error);}
}
export async function POST(request:Request){
  try{checkOrigin(request);const user=await currentUser();if(!user)throw new HttpError(401,"יש להתחבר מחדש.");const subscription=subscriptionSchema.parse(await jsonBody(request));await db.pushSubscription.upsert({where:{endpoint:subscription.endpoint},create:{userId:user.id,endpoint:subscription.endpoint,p256dh:subscription.keys.p256dh,auth:subscription.keys.auth},update:{userId:user.id,p256dh:subscription.keys.p256dh,auth:subscription.keys.auth,enabled:true}});return NextResponse.json({ok:true});}catch(error){return apiError(error);}
}
export async function DELETE(request:Request){
  try{checkOrigin(request);const user=await currentUser();if(!user)throw new HttpError(401,"יש להתחבר מחדש.");const {endpoint}=z.object({endpoint:z.string().url()}).strict().parse(await jsonBody(request));await db.pushSubscription.deleteMany({where:{endpoint,userId:user.id}});return NextResponse.json({ok:true});}catch(error){return apiError(error);}
}
