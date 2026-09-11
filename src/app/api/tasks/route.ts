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
    return NextResponse.json(tasks.map(t => ({ ...t, dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user) throw new HttpError(401, "יש להתחבר מחדש.");
    const input = taskInput.parse(await jsonBody(request));
    const task = await db.$transaction(async tx => {
      const { recurrenceUntil, ...values } = input;
      const dates: (string | null)[] = [input.dueDate];
      if (input.recurrence !== 'NONE' && input.dueDate) {
        const end = new Date(recurrenceUntil ?? `${Number(input.dueDate.slice(0, 4)) + 1}-${input.dueDate.slice(5)}`);
        let next = new Date(input.dueDate);
        while (dates.length < 370) {
          next = new Date(next);
          next.setUTCDate(next.getUTCDate() + (input.recurrence === 'DAILY' ? 1 : 7));
          if (next > end) break;
          dates.push(next.toISOString().slice(0, 10));
        }
      }
      const seriesId = dates.length > 1 ? crypto.randomUUID() : null;
      const created = await Promise.all(dates.map(dueDate => tx.task.create({ data: { ...values, dueDate: dueDate ? new Date(dueDate) : null, seriesId, userId: user.id, completedAt: input.status === "DONE" ? new Date() : null } })));
      await tx.taskEvent.createMany({ data: created.map(record => ({ userId: user.id, taskId: record.id, action: 'CREATED', snapshot: input })) });
      return created[0];
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) { return apiError(error); }
}
