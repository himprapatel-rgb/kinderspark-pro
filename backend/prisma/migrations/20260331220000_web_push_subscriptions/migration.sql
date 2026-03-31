-- Web Push: multiple devices per student + parent profiles

CREATE TABLE "WebPushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "subscriptionJson" TEXT NOT NULL,
    "studentId" TEXT,
    "parentProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");

CREATE INDEX "WebPushSubscription_studentId_idx" ON "WebPushSubscription"("studentId");

CREATE INDEX "WebPushSubscription_parentProfileId_idx" ON "WebPushSubscription"("parentProfileId");

ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
