ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "currentOdometerKm" INTEGER;
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "totalCost" DECIMAL(12,2);
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "notes" VARCHAR(1000) NOT NULL DEFAULT '';
UPDATE "FuelEntry" SET "totalCost" = ROUND("liters" * "pricePerLiter", 2) WHERE "totalCost" IS NULL;
