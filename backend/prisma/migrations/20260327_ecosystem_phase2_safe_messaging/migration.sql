-- Phase 2 ecosystem expansion (safe, additive, non-destructive)
-- Includes:
-- - direct teacher-student override assignment table
-- - threaded messaging tables for school/class/student/direct scopes
-- - optional admin profile table
-- - additive School columns for locale/timezone/status

DO $$ BEGIN
  CREATE TYPE "ThreadScope" AS ENUM ('school', 'classGroup', 'student', 'direct');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessagePriority" AS ENUM ('normal', 'important', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageKind" AS ENUM ('school_announcement', 'class_update', 'direct_message');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS "AdminProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminProfile_userId_key" ON "AdminProfile"("userId");
CREATE INDEX IF NOT EXISTS "AdminProfile_schoolId_idx" ON "AdminProfile"("schoolId");

DO $$ BEGIN
  ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "TeacherStudentAssignment" (
  "id" TEXT NOT NULL,
  "teacherProfileId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "subject" TEXT,
  "reason" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherStudentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherStudentAssignment_teacherProfileId_studentProfileId_subject_key"
  ON "TeacherStudentAssignment"("teacherProfileId", "studentProfileId", "subject");
CREATE INDEX IF NOT EXISTS "TeacherStudentAssignment_studentProfileId_isActive_idx"
  ON "TeacherStudentAssignment"("studentProfileId", "isActive");
CREATE INDEX IF NOT EXISTS "TeacherStudentAssignment_teacherProfileId_isActive_idx"
  ON "TeacherStudentAssignment"("teacherProfileId", "isActive");

DO $$ BEGIN
  ALTER TABLE "TeacherStudentAssignment" ADD CONSTRAINT "TeacherStudentAssignment_teacherProfileId_fkey"
    FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherStudentAssignment" ADD CONSTRAINT "TeacherStudentAssignment_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MessageThread" (
  "id" TEXT NOT NULL,
  "scopeType" "ThreadScope" NOT NULL,
  "schoolId" TEXT,
  "classGroupId" TEXT,
  "studentProfileId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MessageThread_scopeType_schoolId_idx"
  ON "MessageThread"("scopeType", "schoolId");
CREATE INDEX IF NOT EXISTS "MessageThread_scopeType_classGroupId_idx"
  ON "MessageThread"("scopeType", "classGroupId");
CREATE INDEX IF NOT EXISTS "MessageThread_scopeType_studentProfileId_idx"
  ON "MessageThread"("scopeType", "studentProfileId");

DO $$ BEGIN
  ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_classGroupId_fkey"
    FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ThreadParticipant" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleAtJoin" TEXT,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThreadParticipant_threadId_userId_key"
  ON "ThreadParticipant"("threadId", "userId");
CREATE INDEX IF NOT EXISTS "ThreadParticipant_userId_idx"
  ON "ThreadParticipant"("userId");

DO $$ BEGIN
  ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ThreadMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "kind" "MessageKind" NOT NULL,
  "priority" "MessagePriority" NOT NULL DEFAULT 'normal',
  "body" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreadMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ThreadMessage_threadId_sentAt_idx"
  ON "ThreadMessage"("threadId", "sentAt");
CREATE INDEX IF NOT EXISTS "ThreadMessage_priority_sentAt_idx"
  ON "ThreadMessage"("priority", "sentAt");

DO $$ BEGIN
  ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MessageReceipt" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3),
  "ackAt" TIMESTAMP(3),
  CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageReceipt_messageId_userId_key"
  ON "MessageReceipt"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "MessageReceipt_userId_seenAt_idx"
  ON "MessageReceipt"("userId", "seenAt");

DO $$ BEGIN
  ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "ThreadMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
