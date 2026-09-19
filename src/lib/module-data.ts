import { db } from './db';
import { todayIn } from './tasks';
import { nutritionTargets } from './nutrition-targets';
export async function moduleData(userId: string, timezone: string) {
  const today = todayIn(timezone);
  const date = new Date(today);
  const month = new Date(`${today.slice(0, 7)}-01`);
  const weekStart=new Date(`${today}T00:00:00Z`);weekStart.setUTCDate(weekStart.getUTCDate()-weekStart.getUTCDay());
  const weekEnd=new Date(weekStart);weekEnd.setUTCDate(weekEnd.getUTCDate()+6);
  const [storedSettings, water, waterWeekEntries, nutrition, fuel, vehicles,vehicleCount] = await Promise.all([
    db.userSettings.findUnique({ where: { userId } }),
    db.waterEntry.aggregate({ where: { userId, date }, _sum: { amountMl: true } }),
    db.waterEntry.findMany({where:{userId,date:{gte:weekStart,lte:weekEnd}},select:{date:true,amountMl:true}}),
    db.nutritionEntry.aggregate({ where: { userId, date }, _sum: { calories: true, proteinG: true } }),
    db.fuelEntry.findMany({ where: { userId, date: { gte: month, lte: date } }, select: { liters: true, pricePerLiter: true } }),
    db.vehicle.findMany({where:{userId},orderBy:{createdAt:'asc'},select:{name:true,licensePlate:true,year:true,roadMonth:true},take:3}),
    db.vehicle.count({where:{userId}})
  ]);
  const targets=nutritionTargets(storedSettings);
  const settings=storedSettings?{...storedSettings,calorieGoal:targets?.calorieGoal??null,proteinGoalG:targets?.proteinGoalG??null}:null;
  const waterWeek=Array.from({length:7},(_,index)=>{const day=new Date(weekStart);day.setUTCDate(day.getUTCDate()+index);const key=day.toISOString().slice(0,10);return {date:key,amountMl:waterWeekEntries.filter(entry=>entry.date.toISOString().slice(0,10)===key).reduce((sum,entry)=>sum+entry.amountMl,0)};});
  return { today, settings, waterMl: water._sum.amountMl ?? 0, waterWeek, calories: nutrition._sum.calories ?? 0,
    proteinG: Number(nutrition._sum.proteinG ?? 0), vehicleCount,vehicles,
    fuelCost: fuel.reduce((sum, entry) => sum + Math.round(Number(entry.liters) * Number(entry.pricePerLiter) * 100) / 100, 0) };
}
