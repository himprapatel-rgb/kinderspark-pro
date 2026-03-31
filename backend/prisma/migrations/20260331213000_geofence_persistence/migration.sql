-- Geofence opt-in and events (replaces in-memory attendance geofence scaffold)

CREATE TABLE "GeofenceUserConsent" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeofenceUserConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeofenceUserConsent_authUserId_key" ON "GeofenceUserConsent"("authUserId");

CREATE TABLE "GeofenceUserEvent" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "regionLabel" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceUserEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeofenceUserEvent_authUserId_occurredAt_idx" ON "GeofenceUserEvent"("authUserId", "occurredAt");
