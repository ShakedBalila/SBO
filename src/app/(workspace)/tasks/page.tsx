import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayIn } from "@/lib/tasks";
import { TasksWorkspace } from "./tasks-workspace";
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await requireUser();
  const [tasks, events] = await Promise.all([
    db.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.calendarEvent.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' }, take: 500 })
  ]);
  return <TasksWorkspace initialTasks={tasks.map(t => ({ id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority, dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null, recurrence: t.recurrence, seriesId: t.seriesId, createdAt: t.createdAt.toISOString(), completedAt: t.completedAt?.toISOString() ?? null }))} events={events.map(e => ({ id: e.id, title: e.title, type: e.type, date: e.date.toISOString().slice(0, 10), notes: e.notes }))} today={todayIn(user.settings?.timezone ?? "Asia/Jerusalem")} initiallyOpen={(await searchParams).new === "1"}/>;
}
