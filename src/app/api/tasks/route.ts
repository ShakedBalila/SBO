import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInput } from "@/lib/tasks";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/lib/http";
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "יש להתחבר מחדש.");
    const tasks = await db.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(tasks.map(t => ({ ...t, startDate: t.startDate?.toISOString().slice(0, 10) ?? null, endDate:t.endDate?.toISOString().slice(0,10)??null, recurrenceUntil: t.recurrenceUntil?.toISOString().slice(0, 10) ?? null })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user) throw new HttpError(401, "יש להתחבר מחדש.");
    const input = taskInput.parse(await jsonBody(request));
    const task = await db.$transaction(async tx => {
      const created = await tx.task.create({ data: { ...input, startDate: input.startDate ? new Date(input.startDate) : null, endDate:input.endDate?new Date(input.endDate):null, dueDate:input.startDate?new Date(input.startDate):null,time:input.startTime,recurrenceUntil: input.recurrenceUntil ? new Date(input.recurrenceUntil) : null, seriesId: input.recurrence === 'NONE' ? null : crypto.randomUUID(), userId: user.id, completedAt: input.status === "DONE" ? new Date() : null } });
      await tx.taskEvent.create({ data: { userId: user.id, taskId: created.id, action: 'CREATED', snapshot: input } });
      return created;
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) { return apiError(error); }
}
