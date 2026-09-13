import { db } from './db';
import { todayIn } from './tasks';
export async function moduleData(userId: string, timezone: string) {
  const today = todayIn(timezone);
  const date = new Date(today);
  const month = new Date(`${today.slice(0, 7)}-01`);
  const [settings, water, nutrition, fuel, vehicles,vehicleCount] = await Promise.all([
    db.userSettings.findUnique({ where: { userId } }),
    db.waterEntry.aggregate({ where: { userId, date }, _sum: { amountMl: true } }),
    db.nutritionEntry.aggregate({ where: { userId, date }, _sum: { calories: true, proteinG: true } }),
    db.fuelEntry.findMany({ where: { userId, date: { gte: month, lte: date } }, select: { liters: true, pricePerLiter: true } }),
    db.vehicle.findMany({where:{userId},orderBy:{createdAt:'asc'},select:{name:true,licensePlate:true,year:true,roadMonth:true},take:3}),
    db.vehicle.count({where:{userId}})
  ]);
  return { today, settings, waterMl: water._sum.amountMl ?? 0, calories: nutrition._sum.calories ?? 0,
    proteinG: Number(nutrition._sum.proteinG ?? 0), vehicleCount,vehicles,
    fuelCost: fuel.reduce((sum, entry) => sum + Math.round(Number(entry.liters) * Number(entry.pricePerLiter) * 100) / 100, 0) };
}
