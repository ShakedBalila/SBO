import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError, checkOrigin, HttpError, jsonBody } from '@/lib/http';
import { waterInput, waterReminderInput, vehicleReminderSettingsInput, vehicleInput, fuelInput, nutritionInput, goalInput, policyInput, reminderInput, expenseInput, eventInput, eventTypeInput } from '@/lib/modules';
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
    if (kind === 'goals' && request.method === 'POST') {
      const data = goalInput.parse(input);
      await db.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
      return NextResponse.json({ ok: true });
    }
    if(kind==='water-reminders'&&request.method==='POST'){
      const parsed=waterReminderInput.parse(input);
      const data={waterReminderEnabled:parsed.enabled,waterReminderStart:parsed.startTime,waterReminderEnd:parsed.endTime,waterReminderIntervalMinutes:parsed.intervalMinutes};
      await db.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,...data},update:data});
      return NextResponse.json({ok:true});
    }
    if(kind==='vehicle-reminders'&&request.method==='POST'){
      const parsed=vehicleReminderSettingsInput.parse(input);
      await db.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,vehicleReminderEnabled:parsed.enabled},update:{vehicleReminderEnabled:parsed.enabled}});
      return NextResponse.json({ok:true});
    }
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
        if (deleting) { count = (await db.vehicle.deleteMany({ where })).count; break; }
        const data = vehicleInput.parse(input);
        if (id) count = (await db.vehicle.updateMany({ where, data })).count;
        else await db.vehicle.create({ data: { ...data, userId: user.id } });
        break;
      }
      case 'fuel': {
        if (deleting) { count = (await db.fuelEntry.deleteMany({ where })).count; break; }
        const parsed = fuelInput.parse(input);
        const vehicle=await db.vehicle.findFirst({where:{id:parsed.vehicleId,userId:user.id}});
        if(!vehicle)throw new HttpError(404,'הרכב לא נמצא.');
        if(vehicle.fuelTankLiters!==null&&parsed.liters>Number(vehicle.fuelTankLiters))throw new HttpError(400,'כמות התדלוק אינה יכולה לעלות על נפח מכל הדלק של הרכב.');
        const data = { ...parsed, date: new Date(parsed.date) };
        if (id) count = (await db.fuelEntry.updateMany({ where, data })).count;
        else await db.fuelEntry.create({ data: { ...data, userId: user.id } });
        break;
      }
      case 'nutrition': {
        if (deleting) { count = (await db.nutritionEntry.deleteMany({ where })).count; break; }
        const parsed = nutritionInput.parse(input);
        const data = { ...parsed, date: new Date(parsed.date) };
        if (id) count = (await db.nutritionEntry.updateMany({ where, data })).count;
        else await db.nutritionEntry.create({ data: { ...data, userId: user.id } });
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
      case 'expenses': {
        if (deleting) { count = (await db.vehicleExpense.deleteMany({ where })).count; break; }
        const parsed = expenseInput.parse(input);
        if (!await db.vehicle.findFirst({ where: { id: parsed.vehicleId, userId: user.id } })) throw new HttpError(404, 'הרכב לא נמצא.');
        const data = { ...parsed, date: new Date(parsed.date),nextServiceDate:parsed.nextServiceDate?new Date(parsed.nextServiceDate):null };
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
    if (!count) throw new HttpError(404, 'הרשומה לא נמצאה.');
    return NextResponse.json({ ok: true }, { status: request.method === 'POST' ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
