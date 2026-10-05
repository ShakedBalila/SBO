ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "dashboardKmPerLiter" DECIMAL(8,3);
CREATE TABLE IF NOT EXISTS "WorkSettings" ("userId" TEXT PRIMARY KEY, "contract" JSONB NOT NULL, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
ALTER TABLE "WorkSettings" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "WorkTrip" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "destination" VARCHAR(200) NOT NULL, "startDate" DATE NOT NULL, "endDate" DATE NOT NULL, "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT', "details" JSONB NOT NULL, UNIQUE ("id", "userId"), FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
ALTER TABLE "WorkTrip" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "WorkEntry" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "date" DATE NOT NULL, "type" VARCHAR(16) NOT NULL, "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3), "breakMinutes" INTEGER NOT NULL DEFAULT 0, "pausedAt" TIMESTAMP(3), "overtimeApproved" BOOLEAN NOT NULL DEFAULT false, "distanceKm" DECIMAL(10,2) NOT NULL DEFAULT 0, "notes" VARCHAR(2000) NOT NULL DEFAULT '', "tripId" TEXT, UNIQUE ("id", "userId"), FOREIGN KEY ("tripId", "userId") REFERENCES "WorkTrip"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
ALTER TABLE "WorkEntry" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "WorkExpense" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tripId" TEXT, "date" DATE NOT NULL, "category" VARCHAR(30) NOT NULL, "amount" DECIMAL(12,2) NOT NULL, "currency" VARCHAR(3) NOT NULL, "exchangeRate" DECIMAL(14,6) NOT NULL, "rateDate" DATE NOT NULL, "rateSource" VARCHAR(30) NOT NULL, "paymentSource" VARCHAR(16) NOT NULL, "reimbursable" BOOLEAN NOT NULL DEFAULT false, "paid" BOOLEAN NOT NULL DEFAULT false, "notes" VARCHAR(2000) NOT NULL DEFAULT '', "documentId" TEXT, FOREIGN KEY ("tripId", "userId") REFERENCES "WorkTrip"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
ALTER TABLE "WorkExpense" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "WorkDocument" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tripId" TEXT, "entryId" TEXT, "name" VARCHAR(200) NOT NULL, "category" VARCHAR(20) NOT NULL, "mimeType" VARCHAR(80) NOT NULL, "content" BYTEA NOT NULL, "size" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("tripId", "userId") REFERENCES "WorkTrip"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
ALTER TABLE "WorkDocument" ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS "WorkEntry_userId_date_idx" ON "WorkEntry"("userId", "date");
CREATE INDEX IF NOT EXISTS "WorkTrip_userId_startDate_idx" ON "WorkTrip"("userId", "startDate");
CREATE INDEX IF NOT EXISTS "WorkExpense_userId_date_idx" ON "WorkExpense"("userId", "date");
CREATE INDEX IF NOT EXISTS "WorkDocument_userId_createdAt_idx" ON "WorkDocument"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkEntry_one_active_shift" ON "WorkEntry"("userId") WHERE "startedAt" IS NOT NULL AND "endedAt" IS NULL;
DO $$ DECLARE role_name TEXT; table_name TEXT; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      FOREACH table_name IN ARRAY ARRAY['WorkSettings','WorkEntry','WorkTrip','WorkExpense','WorkDocument'] LOOP
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I',table_name,role_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;
