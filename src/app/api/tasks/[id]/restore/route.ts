import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, checkOrigin, HttpError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user) throw new HttpError(401, "יש להתחבר מחדש.");
    const { id } = await context.params;
    const task = await db.task.findFirst({ where: { id, userId: user.id, deletedAt: { not: null } } });
    if (!task) throw new HttpError(404, "המשימה שנמחקה לא נמצאה.");
    await db.$transaction([
      db.task.update({ where: { id, userId: user.id }, data: { deletedAt: null } }),
      db.taskEvent.create({ data: { userId: user.id, taskId: id, action: "RESTORED", snapshot: { title: task.title, status: task.status } } })
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
