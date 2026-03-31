-- Performance indexes (hot query paths)
CREATE INDEX "Student_classId_idx" ON "Student"("classId");
CREATE INDEX "Student_classId_lastLoginAt_idx" ON "Student"("classId", "lastLoginAt");

CREATE INDEX "Homework_classId_dueDate_idx" ON "Homework"("classId", "dueDate");
CREATE INDEX "Homework_syllabusId_idx" ON "Homework"("syllabusId");

CREATE INDEX "HomeworkCompletion_studentId_done_idx" ON "HomeworkCompletion"("studentId", "done");
CREATE INDEX "HomeworkCompletion_homeworkId_idx" ON "HomeworkCompletion"("homeworkId");

CREATE INDEX "Message_classId_createdAt_idx" ON "Message"("classId", "createdAt");
CREATE INDEX "Message_to_read_idx" ON "Message"("to", "read");
CREATE INDEX "Message_fromId_idx" ON "Message"("fromId");

CREATE INDEX "AISession_studentId_idx" ON "AISession"("studentId");
CREATE INDEX "AISession_studentId_createdAt_idx" ON "AISession"("studentId", "createdAt");

CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");
CREATE INDEX "Attendance_classId_date_idx" ON "Attendance"("classId", "date");

CREATE INDEX "AgentMemory_agentId_importance_createdAt_idx" ON "AgentMemory"("agentId", "importance", "createdAt");

-- ActivityPost: Cloudinary URLs (no base64 in DB). Create table if missing (some envs only had schema via db push).
CREATE TABLE IF NOT EXISTS "ActivityPost" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "thumbUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "caption" TEXT NOT NULL,
    "aiCaption" BOOLEAN NOT NULL DEFAULT false,
    "studentTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emoji" TEXT NOT NULL DEFAULT '📸',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityPost_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ActivityPost" ADD CONSTRAINT "ActivityPost_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Migrate legacy base64 column when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ActivityPost' AND column_name = 'imageData'
  ) THEN
    ALTER TABLE "ActivityPost" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "ActivityPost" ADD COLUMN IF NOT EXISTS "thumbUrl" TEXT;
    ALTER TABLE "ActivityPost" ADD COLUMN IF NOT EXISTS "cloudinaryPublicId" TEXT;
    ALTER TABLE "ActivityPost" DROP COLUMN "imageData";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ActivityPost_classId_createdAt_idx" ON "ActivityPost"("classId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityPost_teacherId_idx" ON "ActivityPost"("teacherId");
