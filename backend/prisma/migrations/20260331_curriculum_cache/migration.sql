-- Curriculum & Lesson Cache System
-- Moves module content to DB so standard lessons never need an AI call

CREATE TABLE "CurriculumModule" (
    "id"        TEXT NOT NULL,
    "moduleId"  TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "icon"      TEXT NOT NULL,
    "color"     TEXT NOT NULL DEFAULT '#5E5CE6',
    "type"      TEXT NOT NULL DEFAULT 'items',
    "items"     JSONB NOT NULL,
    "active"    BOOLEAN NOT NULL DEFAULT true,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurriculumModule_moduleId_key" ON "CurriculumModule"("moduleId");
CREATE INDEX "CurriculumModule_active_idx" ON "CurriculumModule"("active");

CREATE TABLE "LessonCache" (
    "id"         TEXT NOT NULL,
    "moduleId"   TEXT NOT NULL,
    "language"   TEXT NOT NULL DEFAULT 'en',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "items"      JSONB NOT NULL,
    "hitCount"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonCache_moduleId_language_difficulty_key" ON "LessonCache"("moduleId", "language", "difficulty");
CREATE INDEX "LessonCache_moduleId_idx" ON "LessonCache"("moduleId");

ALTER TABLE "LessonCache" ADD CONSTRAINT "LessonCache_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule"("moduleId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizQuestion" (
    "id"         TEXT NOT NULL,
    "moduleId"   TEXT NOT NULL,
    "question"   TEXT NOT NULL,
    "options"    JSONB NOT NULL,
    "correctIdx" INTEGER NOT NULL,
    "emoji"      TEXT NOT NULL DEFAULT '⭐',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "language"   TEXT NOT NULL DEFAULT 'en',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuizQuestion_moduleId_difficulty_language_idx" ON "QuizQuestion"("moduleId", "difficulty", "language");

ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule"("moduleId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AIResponseCache" (
    "id"        TEXT NOT NULL,
    "cacheKey"  TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "response"  TEXT NOT NULL,
    "model"     TEXT NOT NULL,
    "hitCount"  INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIResponseCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AIResponseCache_cacheKey_key" ON "AIResponseCache"("cacheKey");
CREATE INDEX "AIResponseCache_cacheKey_idx" ON "AIResponseCache"("cacheKey");
CREATE INDEX "AIResponseCache_expiresAt_idx" ON "AIResponseCache"("expiresAt");
CREATE INDEX "AIResponseCache_type_idx" ON "AIResponseCache"("type");
