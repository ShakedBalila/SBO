BEGIN;
-- This branch runs once: do not populate contracts for later registrations on each deployment.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='UserSettings' AND column_name='onboardingStatus') THEN
  INSERT INTO "WorkSettings" ("userId",contract)
  SELECT id, '
{"baseSalary":16000,"standardMinutes":504,"defaultBreakMinutes":30,"monthlyHours":182,"contributionBasePercent":90,"mealPerDay":37,"travelAllowance":500,"vacationDays":15,"vacationCarryover":0,"sickEntitlement":0,"sickPayPercent":100,"employeePensionPercent":6,"employerPensionPercent":6.5,"severancePercent":8.3,"employeeTrainingPercent":2.5,"employerTrainingPercent":7.5,"overtimeFirstMinutes":120,"overtimeFirstPercent":125,"overtimeNextPercent":150,"workDays":[0,1,2,3,4]}
'::jsonb FROM "User" ON CONFLICT ("userId") DO NOTHING;
  ALTER TABLE "UserSettings" ADD COLUMN "onboardingStatus" VARCHAR(12) NOT NULL DEFAULT 'complete';
 END IF;
END $$;
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "distanceMode" VARCHAR(12) NOT NULL DEFAULT 'odometer';
ALTER TABLE "WorkDocument" ADD COLUMN IF NOT EXISTS "documentDate" DATE;
ALTER TABLE "WorkDocument" ADD COLUMN IF NOT EXISTS "payslipMonth" VARCHAR(7);
ALTER TABLE "WorkDocument" ADD COLUMN IF NOT EXISTS "uploadSize" INTEGER;
COMMIT;
