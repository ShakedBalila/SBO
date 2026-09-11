CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY');
ALTER TABLE "Task" ADD COLUMN "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE', ADD COLUMN "seriesId" TEXT;
CREATE INDEX "Task_userId_seriesId_idx" ON "Task"("userId", "seriesId");

ALTER TABLE "Vehicle" ADD COLUMN "fuelTankLiters" DECIMAL(8,1);
ALTER TABLE "FuelEntry" RENAME COLUMN "odometerKm" TO "estimatedRangeKm";
ALTER TABLE "FuelEntry" ADD COLUMN "actualDistanceKm" INTEGER;

CREATE TABLE "VehiclePolicy" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "type" VARCHAR(20) NOT NULL, "provider" VARCHAR(100) NOT NULL DEFAULT '',
  "annualCost" DECIMAL(12,2) NOT NULL, "startDate" DATE NOT NULL, "endDate" DATE NOT NULL,
  CONSTRAINT "VehiclePolicy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VehiclePolicy_userId_endDate_idx" ON "VehiclePolicy"("userId", "endDate");
ALTER TABLE "VehiclePolicy" ADD CONSTRAINT "VehiclePolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehiclePolicy" ADD CONSTRAINT "VehiclePolicy_vehicleId_userId_fkey" FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VehicleReminder" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "type" VARCHAR(20) NOT NULL, "title" VARCHAR(150) NOT NULL, "dueDate" DATE NOT NULL,
  "cost" DECIMAL(12,2), "notes" VARCHAR(2000) NOT NULL DEFAULT '', "completedAt" TIMESTAMP(3),
  CONSTRAINT "VehicleReminder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VehicleReminder_userId_dueDate_idx" ON "VehicleReminder"("userId", "dueDate");
ALTER TABLE "VehicleReminder" ADD CONSTRAINT "VehicleReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleReminder" ADD CONSTRAINT "VehicleReminder_vehicleId_userId_fkey" FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" VARCHAR(200) NOT NULL,
  "type" VARCHAR(30) NOT NULL DEFAULT 'Other', "date" DATE NOT NULL,
  "notes" VARCHAR(2000) NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalendarEvent_userId_date_idx" ON "CalendarEvent"("userId", "date");
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
