import { z } from 'zod';
export const recordDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Choose a valid date.');
export const waterInput = z.object({ amountMl: z.number().int().min(1).max(10000), date: recordDate }).strict();
export const vehicleInput = z.object({
  name: z.string().trim().min(1, 'Enter a vehicle name.').max(100),
  licensePlate: z.string().trim().max(30).default(''),
  year: z.number().int().min(1900).max(2100).nullable().default(null),
  odometerKm: z.number().int().min(0).max(10000000)
  , fuelTankLiters: z.number().positive().max(1000).nullable().default(null)
}).strict();
export const fuelInput = z.object({
  vehicleId: z.string().min(1), date: recordDate,
  estimatedRangeKm: z.number().int().min(1).max(100000),
  actualDistanceKm: z.number().int().min(0).max(100000).nullable().default(null),
  liters: z.number().positive().max(10000), pricePerLiter: z.number().min(0).max(10000)
}).strict();
export const policyInput = z.object({ vehicleId: z.string().min(1), type: z.enum(['Mandatory', 'Comprehensive', 'Third party']), provider: z.string().trim().max(100).default(''), annualCost: z.number().min(0).max(1000000), startDate: recordDate, endDate: recordDate }).strict();
export const reminderInput = z.object({ vehicleId: z.string().min(1), type: z.enum(['Maintenance', 'Test']), title: z.string().trim().min(1).max(150), dueDate: recordDate, cost: z.number().min(0).max(1000000).nullable().default(null), notes: z.string().trim().max(2000).default('') }).strict();
export const eventInput = z.object({ title: z.string().trim().min(1).max(200), type: z.enum(['Holiday', 'Workout', 'Birthday', 'Appointment', 'Other']), date: recordDate, notes: z.string().trim().max(2000).default('') }).strict();
export const nutritionInput = z.object({
  name: z.string().trim().min(1, 'Enter a food or meal name.').max(200),
  meal: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  calories: z.number().int().min(0).max(100000),
  proteinG: z.number().min(0).max(10000), date: recordDate
}).strict();
export const goalInput = z.object({
  waterGoalMl: z.number().int().min(1).max(20000).nullable().optional(),
  calorieGoal: z.number().int().min(1).max(20000).nullable().optional(),
  proteinGoalG: z.number().int().min(1).max(2000).nullable().optional()
}).strict().refine(input => Object.keys(input).length > 0, 'Enter a goal.');
export type RecordKind = 'water' | 'vehicles' | 'fuel' | 'nutrition' | 'policies' | 'reminders' | 'events';
export type ModuleRecord = { id: string; [key: string]: string | number | null };
