UPDATE "Task" SET "priority" = 'HIGH' WHERE "priority" = 'URGENT';

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_enabled_idx" ON "PushSubscription"("userId", "enabled");

CREATE TABLE "PushDelivery" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "occurrenceKey" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDelivery_subscriptionId_occurrenceKey_key" ON "PushDelivery"("subscriptionId", "occurrenceKey");
CREATE INDEX "PushDelivery_sentAt_idx" ON "PushDelivery"("sentAt");
