import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/lib/http";

const inputSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("status"),ids:z.array(z.string()).min(1).max(200),status:z.enum(["TODO","IN_PROGRESS","DONE","POSTPONED","CANCELLED"])}).strict(),
  z.object({action:z.literal("delete"),ids:z.array(z.string()).min(1).max(200)}).strict()
]);

export async function POST(request:Request){
  try{
    checkOrigin(request);
    const user=await currentUser();
    if(!user)throw new HttpError(401,"יש להתחבר מחדש.");
    const input=inputSchema.parse(await jsonBody(request));
    const ids=[...new Set(input.ids)];
    const owned=await db.task.findMany({where:{userId:user.id,id:{in:ids}},select:{id:true}});
    if(owned.length!==ids.length)throw new HttpError(404,"אחת המשימות לא נמצאה.");
    if(input.action==="delete")await db.task.deleteMany({where:{userId:user.id,id:{in:ids}}});
    else await db.task.updateMany({where:{userId:user.id,id:{in:ids}},data:{status:input.status,completedAt:input.status==="DONE"?new Date():null}});
    return NextResponse.json({ok:true,count:ids.length});
  }catch(error){return apiError(error);}
}
