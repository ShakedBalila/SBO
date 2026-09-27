ALTER TABLE "UserSettings"
  ADD COLUMN IF NOT EXISTS "nutritionGoalMode" VARCHAR(10) NOT NULL DEFAULT 'auto';

ALTER TABLE "NutritionEntry"
  ADD COLUMN IF NOT EXISTS "foodKey" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(30) NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS "NutritionEntry_userId_foodKey_idx"
  ON "NutritionEntry"("userId", "foodKey");

CREATE TABLE IF NOT EXISTS "UserFood" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "brand" VARCHAR(120) NOT NULL DEFAULT '',
  "caloriesPer100" INTEGER NOT NULL,
  "proteinPer100G" DECIMAL(8,1) NOT NULL,
  "carbsPer100G" DECIMAL(8,1) NOT NULL,
  "fatPer100G" DECIMAL(8,1) NOT NULL,
  "barcode" VARCHAR(40) NOT NULL DEFAULT '',
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserFood_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserFood_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserFood_userId_name_idx" ON "UserFood"("userId", "name");
CREATE INDEX IF NOT EXISTS "UserFood_userId_barcode_idx" ON "UserFood"("userId", "barcode");

CREATE TABLE IF NOT EXISTS "FoodPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "foodKey" VARCHAR(160) NOT NULL,
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FoodPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FoodPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FoodPreference_userId_foodKey_key" ON "FoodPreference"("userId", "foodKey");
CREATE INDEX IF NOT EXISTS "FoodPreference_userId_favorite_lastUsedAt_idx" ON "FoodPreference"("userId", "favorite", "lastUsedAt");

-- These tables are accessed only by SBO's authenticated server connection.
ALTER TABLE "UserFood" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FoodPreference" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "UserFood" FROM anon;
    REVOKE ALL ON TABLE "FoodPreference" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "UserFood" FROM authenticated;
    REVOKE ALL ON TABLE "FoodPreference" FROM authenticated;
  END IF;
END
$$;
