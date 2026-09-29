ALTER TABLE "FuelEntry" ALTER COLUMN "estimatedRangeKm" DROP NOT NULL;
ALTER TABLE "FuelEntry" ADD COLUMN IF NOT EXISTS "isFullTank" BOOLEAN;

-- Existing refuels stay unclassified. They must be marked full or partial by the
-- user before they can participate in a full-to-full consumption cycle.
