ALTER TYPE "Recurrence" ADD VALUE IF NOT EXISTS 'MONTHLY';
ALTER TYPE "Recurrence" ADD VALUE IF NOT EXISTS 'CUSTOM';

ALTER TABLE "Task"
  ADD COLUMN "recurrenceDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "recurrenceUntil" DATE,
  ADD COLUMN "time" VARCHAR(5),
  ADD COLUMN "showOnCalendar" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reminderMinutes" INTEGER;

ALTER TABLE "CalendarEvent"
  ADD COLUMN "endDate" DATE,
  ADD COLUMN "time" VARCHAR(5),
  ADD COLUMN "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "recurrenceDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "recurrenceUntil" DATE,
  ADD COLUMN "reminderMinutes" INTEGER;

ALTER TABLE "NutritionEntry"
  ADD COLUMN "carbsG" DECIMAL(8,1) NOT NULL DEFAULT 0,
  ADD COLUMN "fatG" DECIMAL(8,1) NOT NULL DEFAULT 0,
  ADD COLUMN "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN "unit" VARCHAR(30) NOT NULL DEFAULT 'מנה',
  ADD COLUMN "barcode" VARCHAR(40) NOT NULL DEFAULT '';

ALTER TABLE "UserSettings"
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "sex" VARCHAR(10),
  ADD COLUMN "heightCm" INTEGER,
  ADD COLUMN "weightKg" DECIMAL(6,2),
  ADD COLUMN "activityLevel" VARCHAR(20),
  ADD COLUMN "weightGoal" VARCHAR(20);

CREATE TABLE "VehicleExpense" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "date" DATE NOT NULL,
  "notes" VARCHAR(2000) NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VehicleExpense_vehicleId_userId_fkey" FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VehicleExpense_userId_date_idx" ON "VehicleExpense"("userId", "date");
