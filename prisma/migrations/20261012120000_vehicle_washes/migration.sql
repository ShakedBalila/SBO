BEGIN;
-- Reuse the private vehicle expense ledger; washes are never recurring or fuel.
ALTER TABLE "VehicleExpense" ADD COLUMN IF NOT EXISTS "washType" VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE "VehicleExpense" ADD COLUMN IF NOT EXISTS "location" VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE "VehicleExpense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- The existing app authorizes through private server sessions, as in WorkExpense.
ALTER TABLE "VehicleExpense" ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE client_role TEXT; BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "VehicleExpense" FROM %I',client_role);
    END IF;
  END LOOP;
END $$;
COMMIT;
