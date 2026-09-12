import { z } from "zod";
export const taskStatuses = ["TODO", "IN_PROGRESS", "DONE", "POSTPONED", "CANCELLED"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export const recurrences = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"] as const;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid due date.").refine(value => {
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid due date.");
export const taskInput = z.object({
  title: z.string().trim().min(1, "Give your task a title.").max(200, "Keep the title under 200 characters."),
  description: z.string().trim().max(5000).default(""),
  status: z.enum(taskStatuses).default("TODO"),
  priority: z.enum(taskPriorities).default("MEDIUM"),
  startDate: dateOnly.nullable().default(null),
  endDate: dateOnly.nullable().default(null),
  recurrence: z.enum(recurrences).default('NONE'),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  recurrenceUntil: dateOnly.nullable().default(null),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
  category: z.string().trim().max(80).nullable().default(null),
  showOnCalendar: z.boolean().default(true),
  reminderMinutes: z.number().int().min(0).max(10080).nullable().default(null)
}).strict()
  .refine(input => input.recurrence === 'NONE' || !!input.startDate, { message: 'יש לבחור תאריך למשימה חוזרת.' })
  .refine(input => !input.endDate || (!!input.startDate && input.endDate >= input.startDate), { message: 'תאריך הסיום חייב להיות לאחר תאריך ההתחלה.' })
  .refine(input => !input.endTime || !input.startTime || input.endDate !== input.startDate || input.endTime >= input.startTime, { message: 'שעת הסיום חייבת להיות לאחר שעת ההתחלה.' })
  .refine(input => input.recurrence !== 'CUSTOM' || input.recurrenceDays.length > 0, { message: 'יש לבחור לפחות יום אחד לחזרתיות מותאמת.' });
export type TaskInput = z.infer<typeof taskInput>;
export type TaskDTO = TaskInput & { id: string; seriesId: string | null; createdAt: string; completedAt: string | null };
export function todayIn(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(key => parts.find(p => p.type === key)!.value).join("-");
}
