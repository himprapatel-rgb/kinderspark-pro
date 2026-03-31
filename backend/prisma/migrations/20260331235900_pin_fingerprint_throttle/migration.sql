-- Deterministic PIN fingerprint for faster candidate pre-filtering.
ALTER TABLE "User" ADD COLUMN "pinFingerprint" VARCHAR(64);
ALTER TABLE "Student" ADD COLUMN "pinFingerprint" VARCHAR(64);
ALTER TABLE "Teacher" ADD COLUMN "pinFingerprint" VARCHAR(64);
ALTER TABLE "Admin" ADD COLUMN "pinFingerprint" VARCHAR(64);

CREATE INDEX "User_pinFingerprint_idx" ON "User"("pinFingerprint");
CREATE INDEX "Student_pinFingerprint_idx" ON "Student"("pinFingerprint");
CREATE INDEX "Teacher_pinFingerprint_idx" ON "Teacher"("pinFingerprint");
CREATE INDEX "Admin_pinFingerprint_idx" ON "Admin"("pinFingerprint");

-- IP+role+school throttling to slow brute-force PIN attempts.
CREATE TABLE "PinLoginThrottle" (
  "key" TEXT NOT NULL,
  "schoolCode" VARCHAR(6) NOT NULL,
  "role" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PinLoginThrottle_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "PinLoginThrottle_schoolCode_role_idx" ON "PinLoginThrottle"("schoolCode", "role");
CREATE INDEX "PinLoginThrottle_ip_updatedAt_idx" ON "PinLoginThrottle"("ip", "updatedAt");

