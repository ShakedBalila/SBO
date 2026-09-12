ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Task" ALTER COLUMN "showOnCalendar" SET DEFAULT false;
CREATE INDEX "Task_userId_deletedAt_idx" ON "Task"("userId", "deletedAt");
