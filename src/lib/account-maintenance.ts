import {db} from './db';

// Only the authenticated maintenance job calls this. No admin UI can skip the grace period.
export async function purgeExpiredAccounts(now=new Date()){
 const cutoff=new Date(now.valueOf()-30*86400000);
 const candidates=await db.user.findMany({where:{role:'user',status:'pending_deletion',deletionRequestedAt:{lte:cutoff}},select:{id:true},take:20});
 let purged=0;
 for(const candidate of candidates)await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.id}))`;
  const user=await tx.user.findFirst({where:{id:candidate.id,role:'user',status:'pending_deletion',deletionRequestedAt:{lte:cutoff}}});
  if(!user)return;
  await tx.$executeRaw`DELETE FROM "PushDelivery" WHERE "subscriptionId" IN (SELECT id FROM "PushSubscription" WHERE "userId"=${user.id})`;
  // Fixed identifiers only; user input is always a bound parameter. Child rows precede parents.
  for(const table of ['FoodPhoto','FoodPhotoDraft','WorkExpense','WorkDocument','WorkEntry','WorkTrip','WorkContractVersion','Employment','WorkSettings','WorkoutSession','WorkoutLink','WorkoutPlan','WorkoutExercise','FuelEntry','VehiclePolicy','VehicleReminder','VehicleExpense','Vehicle','TaskEvent','Task','CalendarEvent','EventType','NutritionEntry','UserFood','FoodPreference','PersonalRecipe','WaterEntry','PushSubscription','Session','ReminderOverride','AccountToken','AccountIdentity','OAuthAttempt','UserSettings','AuditEvent']){
   await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "userId"=$1`,user.id);
  }
  await tx.invitation.deleteMany({where:{email:user.email}});
  await tx.user.update({where:{id:user.id},data:{status:'deleted',email:`deleted-${user.id}@invalid.local`,name:'חשבון שנמחק',firstName:'',lastName:'',phone:'',avatar:null,passwordHash:'',emailVerifiedAt:null}});
  await tx.auditEvent.create({data:{userId:user.id,action:'ACCOUNT_PURGED',entityType:'ACCOUNT',entityId:user.id}});
  purged++;
 },{timeout:30000});
 await db.accountToken.deleteMany({where:{expiresAt:{lt:now}}});
 await db.oAuthAttempt.deleteMany({where:{expiresAt:{lt:now}}});
 await db.auditEvent.deleteMany({where:{occurredAt:{lt:new Date(now.valueOf()-180*86400000)}}});
 return purged;
}
