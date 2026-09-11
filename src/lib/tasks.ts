import { z } from "zod";
export const taskStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const recurrences = ["NONE", "DAILY", "WEEKLY"] as const;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid due date.").refine(value => {
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid due date.");
export const taskInput = z.object({
  title: z.string().trim().min(1, "Give your task a title.").max(200, "Keep the title under 200 characters."),
  description: z.string().trim().max(5000).default(""),
  status: z.enum(taskStatuses).default("TODO"),
  priority: z.enum(taskPriorities).default("MEDIUM"),
  dueDate: dateOnly.nullable().default(null),
  recurrence: z.enum(recurrences).default('NONE'),
  recurrenceUntil: dateOnly.nullable().default(null)
}).strict();
export type TaskInput = z.infer<typeof taskInput>;
export type TaskDTO = Omit<TaskInput, 'recurrenceUntil'> & { id: string; seriesId: string | null; createdAt: string; completedAt: string | null };
export function todayIn(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(key => parts.find(p => p.type === key)!.value).join("-");
}
