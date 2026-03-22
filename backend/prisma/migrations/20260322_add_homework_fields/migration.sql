-- AlterTable: add missing Homework columns
ALTER TABLE "Homework" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Homework" ADD COLUMN IF NOT EXISTS "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
