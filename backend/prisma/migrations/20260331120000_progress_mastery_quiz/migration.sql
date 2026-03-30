-- Progress scoring + mastery + quiz item log

ALTER TABLE "Progress" ADD COLUMN "score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Progress" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Progress" ADD COLUMN "correctAnswers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Progress" ADD COLUMN "totalQuestions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Progress" ADD COLUMN "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Progress" ADD COLUMN "masteryLevel" TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE "Progress" ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE INDEX "Progress_studentId_idx" ON "Progress"("studentId");

CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL DEFAULT '',
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuizResponse_studentId_moduleId_idx" ON "QuizResponse"("studentId", "moduleId");
CREATE INDEX "QuizResponse_studentId_createdAt_idx" ON "QuizResponse"("studentId", "createdAt");

ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
