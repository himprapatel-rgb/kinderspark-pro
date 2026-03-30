-- AlterTable
ALTER TABLE "School" ADD COLUMN "schoolCode" VARCHAR(6);

-- Deterministic unique backfill from id (hex subset; sufficient for typical row counts)
UPDATE "School" SET "schoolCode" = UPPER(SUBSTRING(MD5("id"::text), 1, 6)) WHERE "schoolCode" IS NULL;

-- Resolve rare collisions by appending position (should not run on empty DBs)
UPDATE "School" AS s
SET "schoolCode" = UPPER(SUBSTRING(MD5(s."id"::text || '2'), 1, 6))
WHERE EXISTS (
  SELECT 1 FROM "School" s2
  WHERE s2."schoolCode" = s."schoolCode" AND s2."id" <> s."id"
);

ALTER TABLE "School" ALTER COLUMN "schoolCode" SET NOT NULL;

CREATE UNIQUE INDEX "School_schoolCode_key" ON "School"("schoolCode");
