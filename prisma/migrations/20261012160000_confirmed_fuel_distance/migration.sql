-- Additive and idempotent: retain historic actualDistanceKm, odometers and prices.
-- No historic value is silently promoted to an explicitly confirmed measurement.
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "distanceStartRefuelId" VARCHAR(64);
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "distanceSource" VARCHAR(24);
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "distanceConfirmedAt" TIMESTAMP(3);
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "clientRequestId" VARCHAR(36);
CREATE UNIQUE INDEX IF NOT EXISTS "FuelEntry_userId_clientRequestId_key" ON "FuelEntry" ("userId", "clientRequestId");
CREATE INDEX IF NOT EXISTS "FuelEntry_userId_vehicleId_date_createdAt_idx"
  ON "FuelEntry" ("userId", "vehicleId", "date", "createdAt");
-- SBO uses owner-scoped server sessions, not direct Supabase client access.
-- Match the existing VehicleExpense access model for private fuel measurements.
ALTER TABLE "FuelEntry" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "FuelEntry" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "FuelEntry" FROM authenticated;
  END IF;
END $$;
