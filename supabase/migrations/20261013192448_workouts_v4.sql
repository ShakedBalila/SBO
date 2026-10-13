ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "creatineDosageText" VARCHAR(200) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS "WorkoutPlan" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "name" VARCHAR(120) NOT NULL, "version" INT NOT NULL DEFAULT 1, "active" BOOLEAN NOT NULL DEFAULT false, "archived" BOOLEAN NOT NULL DEFAULT false, "draft" BOOLEAN NOT NULL DEFAULT true, "content" JSONB NOT NULL, "importKey" VARCHAR(64), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutPlan_userId_importKey_key" ON "WorkoutPlan"("userId","importKey");
CREATE INDEX IF NOT EXISTS "WorkoutPlan_userId_active_idx" ON "WorkoutPlan"("userId","active");
CREATE TABLE IF NOT EXISTS "WorkoutSession" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "planId" TEXT NOT NULL, "dayId" VARCHAR(80) NOT NULL, "localDate" VARCHAR(10) NOT NULL, "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED', "snapshot" JSONB NOT NULL, "performed" JSONB NOT NULL, "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3), "pausedAt" TIMESTAMP(3), "pausedSeconds" INT NOT NULL DEFAULT 0, "revision" INT NOT NULL DEFAULT 0, "notes" VARCHAR(2000) NOT NULL DEFAULT '', "importKey" VARCHAR(64), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutSession_userId_planId_dayId_localDate_key" ON "WorkoutSession"("userId","planId","dayId","localDate");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutSession_userId_importKey_key" ON "WorkoutSession"("userId","importKey");
CREATE INDEX IF NOT EXISTS "WorkoutSession_userId_localDate_idx" ON "WorkoutSession"("userId","localDate");
CREATE INDEX IF NOT EXISTS "WorkoutSession_planId_userId_idx" ON "WorkoutSession"("planId","userId");
CREATE TABLE IF NOT EXISTS "WorkoutExercise" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "name" VARCHAR(150) NOT NULL, "details" JSONB NOT NULL, "favorite" BOOLEAN NOT NULL DEFAULT false, "image" BYTEA, "imageMime" VARCHAR(30), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "WorkoutExercise_userId_idx" ON "WorkoutExercise"("userId");
CREATE TABLE IF NOT EXISTS "WorkoutLink" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "sourceKind" VARCHAR(10) NOT NULL, "sourceId" TEXT NOT NULL, "localDate" VARCHAR(10) NOT NULL, "original" JSONB NOT NULL, "hidden" BOOLEAN NOT NULL DEFAULT true);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutLink_userId_sourceKind_sourceId_key" ON "WorkoutLink"("userId","sourceKind","sourceId");
CREATE INDEX IF NOT EXISTS "WorkoutLink_userId_localDate_idx" ON "WorkoutLink"("userId","localDate");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutPlan_id_userId_key" ON "WorkoutPlan"("id","userId");
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='WorkoutSession_planId_userId_fkey') THEN
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_planId_userId_fkey" FOREIGN KEY ("planId","userId") REFERENCES "WorkoutPlan"("id","userId") ON DELETE NO ACTION ON UPDATE CASCADE;
END IF; END $$;
DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['WorkoutPlan','WorkoutSession','WorkoutExercise','WorkoutLink'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM anon',t); END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated',t); END IF;
END LOOP; END $$;
