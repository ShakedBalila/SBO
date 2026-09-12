import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskInput } from "@/lib/tasks";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
async function mutate(request: Request, context: Context, remove: boolean) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user) throw new HttpError(401, "יש להתחבר מחדש.");
    const { id } = await context.params;
    const input = remove ? null : taskInput.parse(await jsonBody(request));
    await db.$transaction(async tx => {
      const existing = await tx.task.findFirst({ where: { id, userId: user.id } });
      if (!existing) throw new HttpError(404, "המשימה לא נמצאה.");
      if (input) {
        await tx.task.update({ where: { id, userId: user.id }, data: { ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null, recurrenceUntil: input.recurrenceUntil ? new Date(input.recurrenceUntil) : null, completedAt: input.status === "DONE" ? existing.completedAt ?? new Date() : null } });
      } else {
        await tx.task.delete({ where: { id, userId: user.id } });
      }
      await tx.taskEvent.create({ data: { userId: user.id, taskId: id, action: remove ? "DELETED" : "UPDATED", snapshot: input ?? { title: existing.title, description: existing.description, status: existing.status, priority: existing.priority, dueDate: existing.dueDate?.toISOString().slice(0, 10) ?? null } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export const PATCH = (request: Request, context: Context) => mutate(request, context, false);
export const DELETE = (request: Request, context: Context) => mutate(request, context, true);
