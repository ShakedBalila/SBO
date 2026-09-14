import { z } from 'zod';
export const recordDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Choose a valid date.');
export const waterInput = z.object({ amountMl: z.number().int().min(1).max(10000), date: recordDate }).strict();
const clockTime=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'יש לבחור שעה תקינה.');
const wholeHour=z.string().regex(/^([01]\d|2[0-3]):00$/,'יש לבחור שעה עגולה.');
const optionalReminderDays=z.preprocess(value=>value===''||value===null?null:Number(value),z.number().int().min(0).max(365).nullable());
export const waterReminderInput=z.object({enabled:z.boolean(),startTime:clockTime,endTime:clockTime,intervalMinutes:z.number().int().min(15).max(720)}).strict().refine(value=>value.endTime>value.startTime,'שעת הסיום חייבת להיות מאוחרת משעת ההתחלה.');
export const vehicleReminderSettingsInput=z.object({enabled:z.boolean()}).strict();
export const vehicleInput = z.object({
  name: z.string().trim().min(1, 'יש להזין סוג רכב.').max(100),
  licensePlate: z.string().trim().regex(/^\d{2}-\d{3}-\d{2}$|^\d{3}-\d{2}-\d{3}$/,'מבנה מספר לוחית הרישוי אינו מתאים לתאריך העלייה לכביש.'),
  year: z.number().int().min(1900).max(2100),
  roadMonth: z.coerce.number().int().min(1).max(12),
  odometerKm: z.number().int().min(0).max(10000000)
  , fuelTankLiters: z.number().positive().max(1000).nullable().default(null)
}).strict().superRefine((value,ctx)=>{const modern=value.year>2017||(value.year===2017&&value.roadMonth>6),matches=modern?/^\d{3}-\d{2}-\d{3}$/.test(value.licensePlate):/^\d{2}-\d{3}-\d{2}$/.test(value.licensePlate);if(!matches)ctx.addIssue({code:'custom',path:['licensePlate'],message:'מספר לוחית הרישוי אינו מתאים לתאריך העלייה לכביש.'});});
export const fuelInput = z.object({
  vehicleId: z.string().min(1), date: recordDate,
  estimatedRangeKm: z.number().int().min(1).max(100000),
  actualDistanceKm: z.number().int().min(0).max(100000).nullable().default(null),
  liters: z.number().positive().max(10000), pricePerLiter: z.number().min(0).max(10000)
}).strict();
export const policyInput = z.object({ vehicleId: z.string().min(1), type: z.enum(['Mandatory', 'Comprehensive', 'Third party']), provider: z.string().trim().max(100).default(''), annualCost: z.number().min(0).max(1000000), startDate: recordDate, endDate: recordDate, reminderDays:optionalReminderDays.default(null),reminderTime:clockTime.default('09:00') }).strict().refine(value=>value.endDate>=value.startDate,'תאריך סיום הביטוח חייב להיות לאחר תאריך ההתחלה.');
export const reminderInput = z.object({ vehicleId: z.string().min(1), type: z.literal('Test'), title: z.string().trim().min(1).max(150).default('טסט'), dueDate: recordDate, expiryDate:recordDate, cost: z.number().min(0).max(1000000).nullable().default(null), licenseFee:z.number().min(0).max(1000000),testFee:z.number().min(0).max(1000000),reminderDays:optionalReminderDays.default(null),reminderTime:clockTime.default('09:00'), notes: z.string().trim().max(2000).default('') }).strict().refine(value=>value.expiryDate>=value.dueDate,'תאריך גמר הטסט חייב להיות לאחר תאריך הביצוע.');
const recurrence = z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'יש לבחור צבע תקין.');
export const eventInput = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(30).default('אחר'),
  date: recordDate,
  endDate: recordDate.nullable().default(null),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  allDay: z.boolean().default(true),
  color: color.default('#4f7cff'),
  eventTypeId: z.string().min(1).nullable().default(null),
  recurrence: recurrence.default('NONE'),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  recurrenceUntil: recordDate.nullable().default(null),
  reminderMinutes: z.number().int().min(0).max(10080).nullable().default(null),
  notes: z.string().trim().max(2000).default('')
}).strict()
  .refine(value => !value.endDate || value.endDate >= value.date, 'תאריך הסיום חייב להיות לאחר תאריך ההתחלה.')
  .refine(value => value.recurrence !== 'CUSTOM' || value.recurrenceDays.length > 0, 'יש לבחור לפחות יום אחד לחזרתיות מותאמת.');
export const eventTypeInput = z.object({name:z.string().trim().min(1).max(80),color:color.default('#4f7cff')}).strict();
export const nutritionInput = z.object({
  name: z.string().trim().min(1, 'Enter a food or meal name.').max(200),
  meal: z.string().trim().max(20).default('Other'),
  calories: z.number().int().min(0).max(100000),
  proteinG: z.number().min(0).max(10000),
  carbsG: z.number().min(0).max(10000).default(0),
  fatG: z.number().min(0).max(10000).default(0),
  quantity: z.number().positive().max(10000).default(1),
  unit: z.string().trim().min(1).max(30).default('מנה'),
  barcode: z.string().trim().max(40).default(''),
  date: recordDate
}).strict();
export const expenseInput = z.object({ vehicleId: z.string().min(1), type: z.enum(['Maintenance', 'Repair', 'Test', 'Other']), title: z.string().trim().min(1).max(150), amount: z.number().min(0).max(1000000), date: recordDate, nextServiceDate:recordDate.nullable().default(null),reminderDays:optionalReminderDays.default(null),reminderTime:clockTime.default('09:00'), notes: z.string().trim().max(2000).default('') }).strict().refine(value=>value.reminderDays===null||value.nextServiceDate!==null,'יש להזין מועד לטיפול הבא כדי להפעיל התראה.');
export const goalInput = z.object({
  waterGoalMl: z.number().int().min(1).max(20000).nullable().optional(),
  waterDayStart: wholeHour.optional(),
  waterDayEnd: wholeHour.optional(),
  waterPaceIntervalHours: z.union([z.literal(2), z.literal(4)]).optional(),
  calorieGoal: z.number().int().min(1).max(20000).nullable().optional(),
  proteinGoalG: z.number().int().min(1).max(2000).nullable().optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  sex: z.enum(['male', 'female']).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  weightKg: z.number().min(30).max(400).nullable().optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).nullable().optional(),
  weightGoal: z.enum(['lose', 'maintain', 'gain']).nullable().optional()
}).strict().refine(input => Object.keys(input).length > 0, 'Enter a goal.').refine(input => !input.waterDayStart || !input.waterDayEnd || input.waterDayEnd > input.waterDayStart, 'שעת הסיום חייבת להיות מאוחרת משעת ההתחלה.');
export type RecordKind = 'water' | 'vehicles' | 'fuel' | 'nutrition' | 'policies' | 'reminders' | 'expenses' | 'events' | 'event-types';
export type ModuleValue = string | number | boolean | null | number[];
export type ModuleRecord = { id: string; [key: string]: ModuleValue };
