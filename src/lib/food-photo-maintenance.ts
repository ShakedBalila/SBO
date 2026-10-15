import {db} from './db';
// Reuse SBO's existing dispatcher; no new recurring job or notification source.
export async function expireFoodPhotoDrafts(userId?:string){
 return db.$transaction(async tx=>{
  const where={...(userId?{userId}:{}),entryId:null,expiresAt:{lt:new Date()}};
  await tx.foodPhoto.deleteMany({where:{draft:where}});
  return tx.foodPhotoDraft.deleteMany({where});
 });
}
