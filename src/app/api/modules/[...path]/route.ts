import {changeVehicle} from '@/lib/vehicle-management';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { nutritionTargets } from '@/lib/nutrition-targets';
import { rebuildFuelCycles, validateFuelOdometers, FuelOdometerError } from '@/lib/fuel-cycles';
import { apiError, checkOrigin, HttpError, jsonBody } from '@/lib/http';
import { waterInput, waterReminderInput, vehicleReminderSettingsInput, creatineReminderInput, vehicleInput, fuelInput, fuelDistanceInput, nutritionInput, goalInput, policyInput, reminderInput, expenseInput, carWashInput, eventInput, eventTypeInput } from '@/lib/modules';
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user) throw new HttpError(401, 'יש להתחבר מחדש.');
    const path = (await context.params).path;
    const [kind, id] = path;
    const deleting = request.method === 'DELETE';
    if (path.length > 2 || (request.method !== 'POST' && !id) || (request.method === 'POST' && id)) throw new HttpError(400, 'כתובת הרשומה אינה תקינה.');
    const input = deleting ? null : await jsonBody(request);
    if(!id&&input?.vehicleId&&await db.vehicle.findFirst({where:{id:input.vehicleId,userId:user.id,archivedAt:{not:null}}}))throw new HttpError(409,'הרכב בארכיון. יש לשחזר אותו לפני הוספת רשומה.');
    if (kind === 'goals' && request.method === 'POST') {
      const data = goalInput.parse(input);
      const profile=await db.userSettings.findUnique({where:{userId:user.id}});
      const targets=nutritionTargets({...profile,...data});
      if(data.nutritionGoalMode!=='manual'){data.nutritionGoalMode='auto';data.calorieGoal=targets?.calorieGoal??null;data.proteinGoalG=targets?.proteinGoalG??null;}
      await db.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
      return NextResponse.json({ ok: true });
    }
    if(kind==='water-reminders'&&request.method==='POST'){
      const parsed=waterReminderInput.parse(input);
      const data={waterReminderEnabled:parsed.enabled,waterReminderStart:parsed.startTime,waterReminderEnd:parsed.endTime,waterReminderIntervalMinutes:parsed.intervalMinutes};
      await db.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,...data},update:data});
      await db.reminderOverride.upsert({where:{userId_source_sourceId:{userId:user.id,source:'water',sourceId:user.id}},create:{userId:user.id,source:'water',sourceId:user.id,enabled:parsed.enabled,resumedAt:new Date()},update:{enabled:parsed.enabled,pauseReason:null,resumedAt:new Date()}});
      return NextResponse.json({ok:true});
    }
    if(kind==='vehicle-reminders'&&request.method==='POST'){
      const parsed=vehicleReminderSettingsInput.parse(input);
      await db.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,vehicleReminderEnabled:parsed.enabled},update:{vehicleReminderEnabled:parsed.enabled}});
      return NextResponse.json({ok:true});
    }
    if(kind==='creatine-reminders'&&request.method==='POST'){
      const parsed=creatineReminderInput.parse(input);
      const data={creatineReminderEnabled:parsed.enabled,creatineReminderTime:parsed.time};
      await db.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,...data},update:data});
      await db.reminderOverride.upsert({where:{userId_source_sourceId:{userId:user.id,source:'creatine',sourceId:user.id}},create:{userId:user.id,source:'creatine',sourceId:user.id,enabled:parsed.enabled,resumedAt:new Date()},update:{enabled:parsed.enabled,pauseReason:null,resumedAt:new Date()}});
      return NextResponse.json({ok:true});
    }
    const reminderSource:Record<string,string>={events:'event',policies:'policy',reminders:'test',expenses:'service'};
    let reminderChanged=false;
    if(id&&!deleting&&reminderSource[kind]){const previous=kind==='events'?await db.calendarEvent.findFirst({where:{id,userId:user.id}}):kind==='policies'?await db.vehiclePolicy.findFirst({where:{id,userId:user.id}}):kind==='reminders'?await db.vehicleReminder.findFirst({where:{id,userId:user.id}}):await db.vehicleExpense.findFirst({where:{id,userId:user.id}});if(previous)reminderChanged=['reminderMinutes','reminderDays','reminderTime'].some(key=>key in input&&input[key]!==Reflect.get(previous,key));}
    const where = { id, userId: user.id };
    // Every branch scopes record access and mutation to the signed-in owner.
    let count = 1;
    switch (kind) {
      case 'water': {
        if (deleting) { count = (await db.waterEntry.deleteMany({ where })).count; break; }
        const parsed = waterInput.parse(input);
        const data = { ...parsed, date: new Date(parsed.date) };
        if (id) count = (await db.waterEntry.updateMany({ where, data })).count;
        else await db.waterEntry.create({ data: { ...data, userId: user.id } });
        break;
      }
      case 'vehicles': {
        if (deleting) { await changeVehicle(user.id,id,'archive'); break; }
        const parsed = vehicleInput.parse(input);
        const data = {...parsed,acquisitionDate:parsed.acquisitionDate?new Date(parsed.acquisitionDate):null};
        if (id) count = (await db.vehicle.updateMany({ where, data })).count;
        else await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;const existing=await tx.vehicle.count({where:{userId:user.id,archivedAt:null}});await tx.vehicle.create({data:{...data,userId:user.id,isPrimary:existing===0}});});
        break;
      }
      case 'fuel-distance': {
        if(request.method!=='PATCH'||!id)throw new HttpError(400,'יש לבחור תדלוק מלא להשלמת המרחק.');
        const parsed=fuelDistanceInput.parse(input);
        await db.$transaction(async transaction=>{
          const entry=await transaction.fuelEntry.findFirst({where});if(!entry)throw new HttpError(404,'התדלוק לא נמצא.');
          const rows=await transaction.fuelEntry.findMany({where:{userId:user.id,vehicleId:entry.vehicleId}}),cycle=rebuildFuelCycles(rows).get(entry.id);
          if(!cycle?.previousFullRefuelId||cycle.previousFullRefuelId!==parsed.startRefuelId||cycle.cycleStatus==='NEEDS_REVIEW')throw new HttpError(409,'גבולות המחזור השתנו או דורשים בדיקה. יש לפתוח מחדש את השלמת המרחק.');
          if(parsed.source==='ODOMETER_CONFIRMED'){
            const baseline=rows.find(row=>row.id===parsed.startRefuelId);
            if(entry.currentOdometerKm===null||baseline?.currentOdometerKm===null||baseline?.currentOdometerKm===undefined||entry.currentOdometerKm-baseline.currentOdometerKm!==parsed.actualDistanceKm)throw new HttpError(400,'יש לאשר מרחק התואם למד האוץ בשני התדלוקים.');
          }
          await transaction.fuelEntry.updateMany({where,data:{actualDistanceKm:parsed.actualDistanceKm,distanceSource:parsed.source,distanceStartRefuelId:parsed.startRefuelId,distanceConfirmedAt:new Date()}});
        },{isolationLevel:'Serializable'});break;
      }
      case 'fuel': {
        if(deleting){await db.$transaction(async transaction=>{count=(await transaction.fuelEntry.deleteMany({where})).count;await transaction.fuelEntry.updateMany({where:{userId:user.id,distanceStartRefuelId:id},data:{distanceConfirmedAt:null}});});break;}
        const parsed=fuelInput.parse(input),vehicle=await db.vehicle.findFirst({where:{id:parsed.vehicleId,userId:user.id}});
        if(!vehicle)throw new HttpError(404,'הרכב לא נמצא.');
        if(vehicle.fuelTankLiters!==null&&parsed.liters>Number(vehicle.fuelTankLiters))throw new HttpError(400,'כמות התדלוק אינה יכולה לעלות על נפח מכל הדלק של הרכב.');
        const {customPricePerLiter,totalCost:paid,actualDistanceKm,distanceSource,distanceConfirmed,...fuel}=parsed;
        const pricePerLiter=paid!==null?paid/fuel.liters:customPricePerLiter??fuel.pricePerLiter;
        const data={...fuel,pricePerLiter,date:new Date(fuel.date),totalCost:paid??Math.round(fuel.liters*pricePerLiter*100)/100};
        try{await db.$transaction(async transaction=>{
          if(!id&&parsed.clientRequestId){const saved=await transaction.fuelEntry.findFirst({where:{userId:user.id,clientRequestId:parsed.clientRequestId}});if(saved){if(saved.vehicleId!==data.vehicleId||saved.date.getTime()!==data.date.getTime()||Number(saved.liters)!==data.liters||Number(saved.totalCost)!==data.totalCost||saved.isFullTank!==data.isFullTank)throw new HttpError(409,'הבקשה כבר נשמרה עם פרטים אחרים. יש לפתוח תדלוק חדש.');return;}}
          const old=id?await transaction.fuelEntry.findFirst({where}):null;
          if(id&&!old)throw new HttpError(404,'התדלוק לא נמצא.');
          const changedBoundary=old&&(old.vehicleId!==data.vehicleId||old.date.getTime()!==data.date.getTime()||old.isFullTank!==data.isFullTank);
          const changedOdometer=old&&old.currentOdometerKm!==data.currentOdometerKm;
          if(changedBoundary)await transaction.fuelEntry.updateMany({where:{userId:user.id,OR:[{id},{distanceStartRefuelId:id}]},data:{distanceConfirmedAt:null}});
          if(changedOdometer)await transaction.fuelEntry.updateMany({where:{userId:user.id,distanceSource:'ODOMETER_CONFIRMED',OR:[{id},{distanceStartRefuelId:id}]},data:{distanceConfirmedAt:null}});
          let savedId=id;
          if(id)count=(await transaction.fuelEntry.updateMany({where,data})).count;
          else savedId=(await transaction.fuelEntry.create({data:{...data,userId:user.id}})).id;
          const rows=await transaction.fuelEntry.findMany({where:{userId:user.id,vehicleId:parsed.vehicleId}});
          if(actualDistanceKm!==null&&actualDistanceKm>0){
            if(!distanceConfirmed)throw new HttpError(400,'יש לאשר שהמרחק בפועל שייך למחזור התדלוק הזה.');
            const cycle=rebuildFuelCycles(rows).get(String(savedId));
            if(!cycle?.previousFullRefuelId||cycle.cycleStatus==='NEEDS_REVIEW')throw new HttpError(409,'לא נמצא תדלוק מלא קודם תקין עבור המרחק שהוזן.');
            if(distanceSource==='ODOMETER_CONFIRMED'){
              const baseline=rows.find(row=>row.id===cycle.previousFullRefuelId),closing=rows.find(row=>row.id===savedId);
              if(!closing||closing.currentOdometerKm===null||baseline?.currentOdometerKm===null||baseline?.currentOdometerKm===undefined||closing.currentOdometerKm-baseline.currentOdometerKm!==actualDistanceKm)throw new HttpError(400,'יש לאשר מרחק התואם למד האוץ בשני התדלוקים.');
            }
            await transaction.fuelEntry.update({where:{id:String(savedId)},data:{actualDistanceKm,distanceSource,distanceStartRefuelId:cycle.previousFullRefuelId,distanceConfirmedAt:new Date()}});
          }
          // Invalidate obsolete endpoint pairs permanently; later restoring a boundary cannot revive stale confirmation.
          const rebuilt=rebuildFuelCycles(rows);for(const row of rows){if(row.distanceConfirmedAt&&rebuilt.get(row.id)?.previousFullRefuelId!==row.distanceStartRefuelId)await transaction.fuelEntry.update({where:{id:row.id},data:{distanceConfirmedAt:null}});}
          validateFuelOdometers(rows);
          if(parsed.currentOdometerKm!==null&&parsed.currentOdometerKm>vehicle.odometerKm)await transaction.vehicle.update({where:{id:vehicle.id},data:{odometerKm:parsed.currentOdometerKm}});
        },{isolationLevel:'Serializable'});}catch(error){if(error instanceof FuelOdometerError)throw new HttpError(400,error.message);throw error;}break;
      }
      case 'nutrition': {
        if (deleting) { count = await db.$transaction(async tx=>{const drafts=await tx.foodPhotoDraft.findMany({where:{userId:user.id,entryId:id},select:{id:true}});await tx.foodPhoto.deleteMany({where:{userId:user.id,draftId:{in:drafts.map(d=>d.id)}}});await tx.foodPhotoDraft.deleteMany({where:{userId:user.id,id:{in:drafts.map(d=>d.id)}}});return (await tx.nutritionEntry.deleteMany({where})).count;}); break; }
        if(id&&await db.nutritionEntry.findFirst({where:{...where,source:'food_photo'}}))throw new HttpError(400,'ארוחה מצולמת יש לערוך דרך צילום אוכל כדי לשמור את המרכיבים והמקורות.');
        const parsed = nutritionInput.parse(input);
        const {preferenceQuantity,preferenceUnit,preferenceServingGrams,preferenceServingName,...entry}=parsed;
        const data = { ...entry, date: new Date(entry.date) };
        if (id) count = (await db.nutritionEntry.updateMany({ where, data })).count;
        else { await db.nutritionEntry.create({ data: { ...data, userId: user.id } }); if(entry.foodKey)await db.foodPreference.upsert({where:{userId_foodKey:{userId:user.id,foodKey:entry.foodKey}},create:{userId:user.id,foodKey:entry.foodKey,useCount:1,lastUsedAt:new Date(),lastQuantity:preferenceQuantity,lastUnit:preferenceUnit,lastServingGrams:preferenceServingGrams,lastServingName:preferenceServingName},update:{useCount:{increment:1},lastUsedAt:new Date(),lastQuantity:preferenceQuantity,lastUnit:preferenceUnit,lastServingGrams:preferenceServingGrams,lastServingName:preferenceServingName}}); }
        break;
      }
      case 'policies': {
        if (deleting) { count = (await db.vehiclePolicy.deleteMany({ where })).count; break; }
        const parsed = policyInput.parse(input);
        if (!await db.vehicle.findFirst({ where: { id: parsed.vehicleId, userId: user.id } })) throw new HttpError(404, 'הרכב לא נמצא.');
        const existing=await db.vehiclePolicy.findFirst({where:{userId:user.id,vehicleId:parsed.vehicleId,type:parsed.type,...(id?{id:{not:id}}:{})}});
        if(existing)throw new HttpError(409,'כבר קיים ביטוח מסוג זה לרכב.');
        const policyCount=await db.vehiclePolicy.count({where:{userId:user.id,vehicleId:parsed.vehicleId,...(id?{id:{not:id}}:{})}});
        if(policyCount>=3)throw new HttpError(409,'ניתן לשמור עד שלושה ביטוחים לכל רכב.');
        const data = { ...parsed, startDate: new Date(parsed.startDate), endDate: new Date(parsed.endDate) };
        if (id) count = (await db.vehiclePolicy.updateMany({ where, data })).count;
        else await db.vehiclePolicy.create({ data: { ...data, userId: user.id } });
        break;
      }
      case 'reminders': {
        if (deleting) { count = (await db.vehicleReminder.deleteMany({ where })).count; break; }
        const parsed = reminderInput.parse(input);
        if (!await db.vehicle.findFirst({ where: { id: parsed.vehicleId, userId: user.id } })) throw new HttpError(404, 'הרכב לא נמצא.');
        const data = { ...parsed, dueDate: new Date(parsed.dueDate), expiryDate:new Date(parsed.expiryDate) };
        if (id) count = (await db.vehicleReminder.updateMany({ where, data })).count;
        else await db.vehicleReminder.create({ data: { ...data, userId: user.id } });
        break;
      }
      case 'car-washes': {
        const washWhere={...where,type:'CarWash'};
        if(deleting){count=(await db.vehicleExpense.deleteMany({where:washWhere})).count;break;}
        const parsed=carWashInput.parse(input);
        if(!await db.vehicle.findFirst({where:{id:parsed.vehicleId,userId:user.id}}))throw new HttpError(404,'הרכב לא נמצא.');
        const data={...parsed,date:new Date(parsed.date),type:'CarWash',title:'שטיפת רכב',nextServiceDate:null,reminderDays:null};
        if(id)count=(await db.vehicleExpense.updateMany({where:washWhere,data})).count;
        else await db.vehicleExpense.create({data:{...data,userId:user.id}});
        break;
      }
      case 'expenses': {
        if (deleting) { count = (await db.vehicleExpense.deleteMany({ where })).count; break; }
        const parsed = expenseInput.parse(input);
        if (!await db.vehicle.findFirst({ where: { id: parsed.vehicleId, userId: user.id } })) throw new HttpError(404, 'הרכב לא נמצא.');
        const personalAmount=parsed.userPaidAmount??(parsed.paidBy==='USER'?(parsed.totalServiceCost??parsed.amount):['PREVIOUS_OWNER','THIRD_PARTY'].includes(parsed.paidBy)?0:parsed.amount);
        const data = { ...parsed, amount:personalAmount,userPaidAmount:parsed.paidBy==='UNKNOWN_LEGACY'?null:personalAmount, date: new Date(parsed.date),nextServiceDate:parsed.nextServiceDate?new Date(parsed.nextServiceDate):null };
        if (id) count = (await db.vehicleExpense.updateMany({ where, data })).count;
        else await db.vehicleExpense.create({ data: { ...data, userId: user.id } });
        break;
      }
      case 'events': {
        if (deleting) { count = (await db.calendarEvent.deleteMany({ where })).count; break; }
        const parsed = eventInput.parse(input);
        if(parsed.eventTypeId&&!await db.eventType.findFirst({where:{id:parsed.eventTypeId,userId:user.id}}))throw new HttpError(404,'סוג האירוע לא נמצא.');
        const data = { ...parsed, date: new Date(parsed.date), endDate: parsed.endDate ? new Date(parsed.endDate) : null, recurrenceUntil: parsed.recurrenceUntil ? new Date(parsed.recurrenceUntil) : null };
        if (id) count = (await db.calendarEvent.updateMany({ where, data })).count;
        else await db.calendarEvent.create({ data: { ...data, userId: user.id } });
        break;
      }
      case 'event-types': {
        if (deleting) { count=(await db.eventType.deleteMany({where})).count; break; }
        const data=eventTypeInput.parse(input);
        if(id) count=(await db.eventType.updateMany({where,data})).count;
        else await db.eventType.create({data:{...data,userId:user.id}});
        break;
      }
      default: throw new HttpError(404, 'התחום לא נמצא.');
    }
    if(id&&reminderChanged&&count)await db.reminderOverride.upsert({where:{userId_source_sourceId:{userId:user.id,source:reminderSource[kind],sourceId:id}},create:{userId:user.id,source:reminderSource[kind],sourceId:id,enabled:true,resumedAt:new Date()},update:{enabled:true,pauseReason:null,resumedAt:new Date()}});
    if (!count) throw new HttpError(404, 'הרשומה לא נמצאה.');
    return NextResponse.json({ ok: true }, { status: request.method === 'POST' ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
