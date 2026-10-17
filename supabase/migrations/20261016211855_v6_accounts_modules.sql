BEGIN;
SELECT pg_advisory_xact_lock(610162118);
DO $v6$ DECLARE role_name text; BEGIN
IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='role') THEN
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" BYTEA,
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" VARCHAR(80) NOT NULL DEFAULT '',
ADD COLUMN     "lastName" VARCHAR(80) NOT NULL DEFAULT '',
ADD COLUMN     "phone" VARCHAR(30) NOT NULL DEFAULT '',
ADD COLUMN     "role" VARCHAR(12) NOT NULL DEFAULT 'user',
ADD COLUMN     "status" VARCHAR(24) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "dashboardOrder" TEXT[] DEFAULT ARRAY['tasks', 'work', 'water', 'nutrition', 'car', 'workouts']::TEXT[],
ADD COLUMN     "modulePreferencesInitialized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "navigationOrder" TEXT[] DEFAULT ARRAY['tasks', 'water', 'nutrition', 'car', 'workouts', 'work']::TEXT[],
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pausedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textScale" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "WorkEntry" ADD COLUMN     "employmentId" TEXT;

-- AlterTable
ALTER TABLE "WorkTrip" ADD COLUMN     "employmentId" TEXT;

-- AlterTable
ALTER TABLE "WorkExpense" ADD COLUMN     "employmentId" TEXT;

-- AlterTable
ALTER TABLE "WorkDocument" ADD COLUMN     "employmentId" TEXT;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "deliveryState" TEXT NOT NULL DEFAULT 'created',

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitationId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAttempt" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "userId" TEXT,
    "invitationHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pauseReason" TEXT,

    CONSTRAINT "ReminderOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'monthly',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkContractVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "contract" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkContractVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_email_expiresAt_idx" ON "Invitation"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountIdentity_provider_subject_key" ON "AccountIdentity"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "AccountIdentity_userId_provider_key" ON "AccountIdentity"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AccountToken_tokenHash_key" ON "AccountToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountToken_userId_purpose_idx" ON "AccountToken"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAttempt_stateHash_key" ON "OAuthAttempt"("stateHash");

-- CreateIndex
CREATE INDEX "ReminderOverride_userId_idx" ON "ReminderOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderOverride_userId_source_sourceId_key" ON "ReminderOverride"("userId", "source", "sourceId");

-- CreateIndex
CREATE INDEX "Employment_userId_idx" ON "Employment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employment_id_userId_key" ON "Employment"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkContractVersion_employmentId_effectiveFrom_key" ON "WorkContractVersion"("employmentId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "WorkEntry" ADD CONSTRAINT "WorkEntry_employmentId_userId_fkey" FOREIGN KEY ("employmentId", "userId") REFERENCES "Employment"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTrip" ADD CONSTRAINT "WorkTrip_employmentId_userId_fkey" FOREIGN KEY ("employmentId", "userId") REFERENCES "Employment"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExpense" ADD CONSTRAINT "WorkExpense_employmentId_userId_fkey" FOREIGN KEY ("employmentId", "userId") REFERENCES "Employment"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDocument" ADD CONSTRAINT "WorkDocument_employmentId_userId_fkey" FOREIGN KEY ("employmentId", "userId") REFERENCES "Employment"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountIdentity" ADD CONSTRAINT "AccountIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkContractVersion" ADD CONSTRAINT "WorkContractVersion_employmentId_userId_fkey" FOREIGN KEY ("employmentId", "userId") REFERENCES "Employment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_role_check" CHECK (role IN ('user','admin'));
ALTER TABLE "User" ADD CONSTRAINT "User_status_check" CHECK (status IN ('active','suspended','pending_deletion','deleted'));
CREATE UNIQUE INDEX "User_single_admin" ON "User" (role) WHERE role='admin';
CREATE UNIQUE INDEX "Vehicle_one_primary" ON "Vehicle" ("userId") WHERE "isPrimary" AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "Employment_one_active" ON "Employment" ("userId") WHERE "archivedAt" IS NULL;
ALTER TABLE "ReminderOverride" ADD CONSTRAINT "ReminderOverride_owner" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_issuer" FOREIGN KEY ("issuerId") REFERENCES "User"(id);
UPDATE "Vehicle" v SET "isPrimary"=true WHERE id=(SELECT id FROM "Vehicle" first WHERE first."userId"=v."userId" ORDER BY "createdAt",id LIMIT 1);
INSERT INTO "Employment" (id,"userId",name) SELECT 'legacy-'||u.id,u.id,'מקום העבודה שלי' FROM "User" u WHERE EXISTS(SELECT 1 FROM "WorkSettings" w WHERE w."userId"=u.id) OR EXISTS(SELECT 1 FROM "WorkEntry" e WHERE e."userId"=u.id) OR EXISTS(SELECT 1 FROM "WorkTrip" e WHERE e."userId"=u.id) OR EXISTS(SELECT 1 FROM "WorkExpense" e WHERE e."userId"=u.id) OR EXISTS(SELECT 1 FROM "WorkDocument" e WHERE e."userId"=u.id);
INSERT INTO "WorkContractVersion"(id,"userId","employmentId","effectiveFrom",contract) SELECT 'legacy-contract-'||e."userId",e."userId",e.id,'1900-01-01',COALESCE(w.contract,'{}'::jsonb) FROM "Employment" e LEFT JOIN "WorkSettings" w ON w."userId"=e."userId";
UPDATE "WorkEntry" w SET "employmentId"=e.id FROM "Employment" e WHERE e."userId"=w."userId";
UPDATE "WorkTrip" w SET "employmentId"=e.id FROM "Employment" e WHERE e."userId"=w."userId";
UPDATE "WorkExpense" w SET "employmentId"=e.id FROM "Employment" e WHERE e."userId"=w."userId";
UPDATE "WorkDocument" w SET "employmentId"=e.id FROM "Employment" e WHERE e."userId"=w."userId";
-- Legacy device subscriptions have no provable session binding. Reconnect the current device explicitly.
UPDATE "PushSubscription" SET enabled=false WHERE "sessionId" IS NULL;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OAuthAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReminderOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkContractVersion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Invitation" FROM PUBLIC;
REVOKE ALL ON "AccountIdentity" FROM PUBLIC;
REVOKE ALL ON "AccountToken" FROM PUBLIC;
REVOKE ALL ON "OAuthAttempt" FROM PUBLIC;
REVOKE ALL ON "ReminderOverride" FROM PUBLIC;
REVOKE ALL ON "Employment" FROM PUBLIC;
REVOKE ALL ON "WorkContractVersion" FROM PUBLIC;
FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
EXECUTE format('REVOKE ALL ON "Invitation" FROM %I',role_name);
EXECUTE format('REVOKE ALL ON "AccountIdentity" FROM %I',role_name);
EXECUTE format('REVOKE ALL ON "AccountToken" FROM %I',role_name);
EXECUTE format('REVOKE ALL ON "OAuthAttempt" FROM %I',role_name);
EXECUTE format('REVOKE ALL ON "ReminderOverride" FROM %I',role_name);
EXECUTE format('REVOKE ALL ON "Employment" FROM %I',role_name);
EXECUTE format('REVOKE ALL ON "WorkContractVersion" FROM %I',role_name);
END LOOP;
END IF;
END $v6$;
CREATE INDEX IF NOT EXISTS "WorkEntry_employment_owner" ON "WorkEntry"("employmentId","userId");
CREATE INDEX IF NOT EXISTS "WorkTrip_employment_owner" ON "WorkTrip"("employmentId","userId");
CREATE INDEX IF NOT EXISTS "WorkExpense_employment_owner" ON "WorkExpense"("employmentId","userId");
CREATE INDEX IF NOT EXISTS "WorkDocument_employment_owner" ON "WorkDocument"("employmentId","userId");
CREATE INDEX IF NOT EXISTS "WorkContractVersion_owner" ON "WorkContractVersion"("userId");
CREATE INDEX IF NOT EXISTS "User_pending_deletion" ON "User"("deletionRequestedAt") WHERE status='pending_deletion';
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "notificationsResumedAt" TIMESTAMP(3);
ALTER TABLE "ReminderOverride" ADD COLUMN IF NOT EXISTS "resumedAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "remindersResumedAt" TIMESTAMP(3);
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;
