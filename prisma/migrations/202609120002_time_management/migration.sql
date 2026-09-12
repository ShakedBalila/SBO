ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'POSTPONED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "Recurrence" ADD VALUE IF NOT EXISTS 'YEARLY';

ALTER TABLE "Task"
  ADD COLUMN "startDate" DATE,
  ADD COLUMN "endDate" DATE,
  ADD COLUMN "startTime" VARCHAR(5),
  ADD COLUMN "endTime" VARCHAR(5),
  ADD COLUMN "color" VARCHAR(7),
  ADD COLUMN "category" VARCHAR(80);
UPDATE "Task" SET "startDate"="dueDate", "endDate"="dueDate", "startTime"="time" WHERE "dueDate" IS NOT NULL;

CREATE TABLE "EventType" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "color" VARCHAR(7) NOT NULL DEFAULT '#4f7cff',
  "icon" VARCHAR(40) NOT NULL DEFAULT '',
  "defaultDescription" VARCHAR(2000) NOT NULL DEFAULT '',
  "defaultDurationMinutes" INTEGER,
  "defaultReminderMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventType_userId_name_key" ON "EventType"("userId", "name");
CREATE INDEX "EventType_userId_idx" ON "EventType"("userId");

ALTER TABLE "CalendarEvent"
  ADD COLUMN "endTime" VARCHAR(5),
  ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "color" VARCHAR(7) NOT NULL DEFAULT '#4f7cff',
  ADD COLUMN "eventTypeId" TEXT;
UPDATE "CalendarEvent" SET "allDay"=true WHERE "time" IS NULL;
CREATE INDEX "CalendarEvent_userId_eventTypeId_idx" ON "CalendarEvent"("userId", "eventTypeId");
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
