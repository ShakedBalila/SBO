import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { moduleData } from '@/lib/module-data';
import { ModuleWorkspace } from '@/components/module-workspace';
import { getIsraelFuelPrice } from '@/lib/fuel-price';
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const module = (await params).module;
  if (module !== 'water' && module !== 'car' && module !== 'nutrition') notFound();
  const user = await requireUser();
  const summary = await moduleData(user.id, user.settings?.timezone ?? 'Asia/Jerusalem');
  const [water, vehicles, fuel, nutrition, policies, reminders, expenses, fuelPrice] = await Promise.all([
    module === 'water' ? db.waterEntry.findMany({ where: { userId: user.id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 2000 }) : [],
    module === 'car' ? db.vehicle.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }) : [],
    module === 'car' ? db.fuelEntry.findMany({ where: { userId: user.id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 200 }) : [],
    module === 'nutrition' ? db.nutritionEntry.findMany({ where: { userId: user.id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 200 }) : [],
    module === 'car' ? db.vehiclePolicy.findMany({ where: { userId: user.id }, orderBy: { endDate: 'asc' } }) : [],
    module === 'car' ? db.vehicleReminder.findMany({ where: { userId: user.id }, orderBy: { dueDate: 'asc' } }) : [],
    module === 'car' ? db.vehicleExpense.findMany({ where: { userId: user.id }, orderBy: [{ date:'desc' },{ createdAt:'desc' }], take: 300 }) : [],
    module === 'car' ? getIsraelFuelPrice() : null
  ]);
  return <ModuleWorkspace module={module} summary={{ today: summary.today, waterMl: summary.waterMl,
    calories: summary.calories, proteinG: summary.proteinG, fuelCost: summary.fuelCost,
    waterGoalMl: summary.settings?.waterGoalMl ?? null, calorieGoal: summary.settings?.calorieGoal ?? null,
    proteinGoalG: summary.settings?.proteinGoalG ?? null, currency: summary.settings?.currency ?? 'ILS',
    age:summary.settings?.age??null,sex:summary.settings?.sex??null,heightCm:summary.settings?.heightCm??null,weightKg:Number(summary.settings?.weightKg??0)||null,activityLevel:summary.settings?.activityLevel??null,weightGoal:summary.settings?.weightGoal??null,timezone:summary.settings?.timezone??'Asia/Jerusalem',
    waterDayStart:summary.settings?.waterDayStart??'08:00',waterDayEnd:summary.settings?.waterDayEnd??'20:00',waterPaceIntervalHours:summary.settings?.waterPaceIntervalHours??2,
    waterReminderEnabled:summary.settings?.waterReminderEnabled??false,waterReminderStart:summary.settings?.waterReminderStart??'08:00',waterReminderEnd:summary.settings?.waterReminderEnd??'16:00',waterReminderIntervalMinutes:summary.settings?.waterReminderIntervalMinutes??60,vehicleReminderEnabled:summary.settings?.vehicleReminderEnabled??false }}
    water={water.map(row => ({ id: row.id, date: row.date.toISOString().slice(0, 10), amountMl: row.amountMl }))}
    vehicles={vehicles.map(row => ({ id: row.id, name: row.name, licensePlate: row.licensePlate, year: row.year, roadMonth:row.roadMonth, odometerKm: row.odometerKm, fuelTankLiters: Number(row.fuelTankLiters ?? 0) || null }))}
    fuel={fuel.map(row => ({ id: row.id, vehicleId: row.vehicleId, date: row.date.toISOString().slice(0, 10), estimatedRangeKm: row.estimatedRangeKm, actualDistanceKm: row.actualDistanceKm, liters: Number(row.liters), pricePerLiter: Number(row.pricePerLiter) }))}
    nutrition={nutrition.map(row => ({ id: row.id, name: row.name, date: row.date.toISOString().slice(0, 10), meal: row.meal, calories: row.calories, proteinG: Number(row.proteinG),carbsG:Number(row.carbsG),fatG:Number(row.fatG),quantity:Number(row.quantity),unit:row.unit,barcode:row.barcode }))}
    policies={policies.map(row => ({ id: row.id, vehicleId: row.vehicleId, type: row.type, provider: row.provider, annualCost: Number(row.annualCost), startDate: row.startDate.toISOString().slice(0,10), endDate: row.endDate.toISOString().slice(0,10),reminderDays:row.reminderDays,reminderTime:row.reminderTime }))}
    reminders={reminders.map(row => ({ id: row.id, vehicleId: row.vehicleId, type: row.type, title: row.title, dueDate: row.dueDate.toISOString().slice(0,10),expiryDate:row.expiryDate?.toISOString().slice(0,10)??row.dueDate.toISOString().slice(0,10), cost: Number(row.cost ?? 0) || null,licenseFee:Number(row.licenseFee??0),testFee:Number(row.testFee??0),reminderDays:row.reminderDays,reminderTime:row.reminderTime, notes: row.notes }))}
    expenses={expenses.map(row=>({id:row.id,vehicleId:row.vehicleId,type:row.type,title:row.title,amount:Number(row.amount),date:row.date.toISOString().slice(0,10),notes:row.notes}))}
    fuelPrice={fuelPrice}/>
}
