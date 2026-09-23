import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayIn } from "@/lib/tasks";
import { TasksWorkspace } from "./tasks-workspace";
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await requireUser();
  const [tasks, events,eventTypes] = await Promise.all([
    db.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.calendarEvent.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' }, take: 500 }),
    db.eventType.findMany({where:{userId:user.id},orderBy:{createdAt:'asc'}})
  ]);
  const timezone=user.settings?.timezone??"Asia/Jerusalem";
  return <TasksWorkspace initialTasks={tasks.map(t => ({ id:t.id,title:t.title,description:t.description,status:t.status,priority:t.priority,startDate:t.startDate?.toISOString().slice(0,10)??null,endDate:t.endDate?.toISOString().slice(0,10)??null,startTime:t.startTime,endTime:t.endTime,color:t.color,category:t.category,recurrence:t.recurrence,recurrenceDays:t.recurrenceDays,recurrenceUntil:t.recurrenceUntil?.toISOString().slice(0,10)??null,showOnCalendar:t.showOnCalendar,reminderMinutes:t.reminderMinutes,seriesId:t.seriesId,createdAt:t.createdAt.toISOString(),completedAt:t.completedAt?.toISOString()??null,deletedAt:t.deletedAt?.toISOString()??null }))} events={events.map(e => ({ id:e.id,title:e.title,type:e.type,date:e.date.toISOString().slice(0,10),endDate:e.endDate?.toISOString().slice(0,10)??null,time:e.time,endTime:e.endTime,allDay:e.allDay,color:e.color,eventTypeId:e.eventTypeId,recurrence:e.recurrence,recurrenceDays:e.recurrenceDays,recurrenceUntil:e.recurrenceUntil?.toISOString().slice(0,10)??null,reminderMinutes:e.reminderMinutes,notes:e.notes }))} eventTypes={eventTypes.map(type=>({id:type.id,name:type.name,color:type.color}))} timezone={timezone} today={todayIn(timezone)} initiallyOpen={(await searchParams).new==="1"}/>;
}


