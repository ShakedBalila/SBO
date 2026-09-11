ALTER TABLE "UserSettings" ALTER COLUMN "locale" SET DEFAULT 'he';
UPDATE "UserSettings" SET "locale" = 'he' WHERE "locale" = 'en';
