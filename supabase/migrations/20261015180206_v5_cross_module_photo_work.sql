-- Private, immutable pre-V5 snapshots of the only existing tables extended here.
CREATE SCHEMA IF NOT EXISTS sbo_backup;
REVOKE ALL ON SCHEMA sbo_backup FROM PUBLIC;
CREATE TABLE IF NOT EXISTS sbo_backup.v5_nutrition_entries AS SELECT id,"userId",name,meal,calories,"proteinG","carbsG","fatG",quantity,unit,barcode,"foodKey",source,date,"createdAt" FROM public."NutritionEntry";
CREATE TABLE IF NOT EXISTS sbo_backup.v5_work_entries AS SELECT id,"userId",date,type,"startedAt","endedAt","breakMinutes","pausedAt","overtimeApproved","distanceKm",notes,"tripId" FROM public."WorkEntry";
ALTER TABLE sbo_backup.v5_nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbo_backup.v5_work_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA sbo_backup FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON SCHEMA sbo_backup FROM anon; REVOKE ALL ON ALL TABLES IN SCHEMA sbo_backup FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON SCHEMA sbo_backup FROM authenticated; REVOKE ALL ON ALL TABLES IN SCHEMA sbo_backup FROM authenticated; END IF;
END $$;
ALTER TABLE "NutritionEntry" ADD COLUMN IF NOT EXISTS "mealDetails" JSONB;
ALTER TABLE "WorkEntry" ADD COLUMN IF NOT EXISTS "breakSegments" JSONB NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS "FoodPhotoDraft" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"content" JSONB NOT NULL,"revision" INT NOT NULL DEFAULT 0,"entryId" TEXT UNIQUE REFERENCES "NutritionEntry"("id") ON DELETE SET NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3));
CREATE UNIQUE INDEX IF NOT EXISTS "FoodPhotoDraft_id_userId_key" ON "FoodPhotoDraft"("id","userId");
CREATE INDEX IF NOT EXISTS "FoodPhotoDraft_userId_updatedAt_idx" ON "FoodPhotoDraft"("userId","updatedAt");
CREATE INDEX IF NOT EXISTS "FoodPhotoDraft_expiresAt_idx" ON "FoodPhotoDraft"("expiresAt");
CREATE TABLE IF NOT EXISTS "FoodPhoto" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"draftId" TEXT NOT NULL,"content" BYTEA NOT NULL,"mimeType" VARCHAR(30) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "FoodPhoto_draftId_userId_fkey" FOREIGN KEY("draftId","userId") REFERENCES "FoodPhotoDraft"("id","userId") ON DELETE NO ACTION ON UPDATE CASCADE);
CREATE INDEX IF NOT EXISTS "FoodPhoto_userId_draftId_idx" ON "FoodPhoto"("userId","draftId");
CREATE INDEX IF NOT EXISTS "FoodPhoto_draftId_userId_idx" ON "FoodPhoto"("draftId","userId");
CREATE TABLE IF NOT EXISTS "PersonalRecipe" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"name" VARCHAR(200) NOT NULL,"version" INT NOT NULL DEFAULT 1,"content" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "PersonalRecipe_userId_name_idx" ON "PersonalRecipe"("userId","name");
DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['FoodPhotoDraft','FoodPhoto','PersonalRecipe'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM anon',t); END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated',t); END IF;
END LOOP; END $$;
