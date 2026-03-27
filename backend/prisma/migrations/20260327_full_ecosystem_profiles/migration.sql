-- Full ecosystem profile scaffold (non-breaking additive migration)
-- Existing legacy models remain intact during dual-read rollout.

DO $$ BEGIN
  CREATE TYPE "ProfileRole" AS ENUM ('principal', 'admin', 'teacher', 'parent', 'child');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "email" TEXT,
  "pin" TEXT,
  "avatar" TEXT,
  "schoolId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ProfileRole" NOT NULL,
  "schoolId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolProfile" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "principalUserId" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "locale" TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PrincipalProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Principal',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrincipalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeacherProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "legacyTeacherId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParentProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT,
  "legacyStudentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "legacyStudentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GradeLevel" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GradeLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassGroup" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "gradeLevelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "section" TEXT,
  "legacyClassId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeacherClassAssignment" (
  "id" TEXT NOT NULL,
  "teacherProfileId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "subject" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherClassAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentClassEnrollment" (
  "id" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentClassEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParentChildLink" (
  "id" TEXT NOT NULL,
  "parentProfileId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL DEFAULT 'guardian',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentChildLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "RoleAssignment_userId_role_schoolId_key" ON "RoleAssignment"("userId","role","schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolProfile_schoolId_key" ON "SchoolProfile"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "PrincipalProfile_userId_key" ON "PrincipalProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_userId_key" ON "TeacherProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_legacyTeacherId_key" ON "TeacherProfile"("legacyTeacherId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentProfile_userId_key" ON "ParentProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_legacyStudentId_key" ON "StudentProfile"("legacyStudentId");
CREATE UNIQUE INDEX IF NOT EXISTS "GradeLevel_schoolId_code_key" ON "GradeLevel"("schoolId","code");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassGroup_legacyClassId_key" ON "ClassGroup"("legacyClassId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassGroup_schoolId_gradeLevelId_name_section_key" ON "ClassGroup"("schoolId","gradeLevelId","name","section");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherClassAssignment_teacherProfileId_classGroupId_subject_key" ON "TeacherClassAssignment"("teacherProfileId","classGroupId","subject");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentChildLink_parentProfileId_studentProfileId_key" ON "ParentChildLink"("parentProfileId","studentProfileId");

CREATE INDEX IF NOT EXISTS "User_schoolId_idx" ON "User"("schoolId");
CREATE INDEX IF NOT EXISTS "RoleAssignment_schoolId_role_idx" ON "RoleAssignment"("schoolId","role");
CREATE INDEX IF NOT EXISTS "PrincipalProfile_schoolId_idx" ON "PrincipalProfile"("schoolId");
CREATE INDEX IF NOT EXISTS "TeacherProfile_schoolId_idx" ON "TeacherProfile"("schoolId");
CREATE INDEX IF NOT EXISTS "ParentProfile_schoolId_idx" ON "ParentProfile"("schoolId");
CREATE INDEX IF NOT EXISTS "StudentProfile_schoolId_idx" ON "StudentProfile"("schoolId");
CREATE INDEX IF NOT EXISTS "GradeLevel_schoolId_order_idx" ON "GradeLevel"("schoolId","order");
CREATE INDEX IF NOT EXISTS "ClassGroup_schoolId_gradeLevelId_idx" ON "ClassGroup"("schoolId","gradeLevelId");
CREATE INDEX IF NOT EXISTS "TeacherClassAssignment_classGroupId_idx" ON "TeacherClassAssignment"("classGroupId");
CREATE INDEX IF NOT EXISTS "StudentClassEnrollment_studentProfileId_status_idx" ON "StudentClassEnrollment"("studentProfileId","status");
CREATE INDEX IF NOT EXISTS "StudentClassEnrollment_classGroupId_status_idx" ON "StudentClassEnrollment"("classGroupId","status");
CREATE INDEX IF NOT EXISTS "ParentChildLink_studentProfileId_idx" ON "ParentChildLink"("studentProfileId");

ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolProfile" ADD CONSTRAINT "SchoolProfile_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolProfile" ADD CONSTRAINT "SchoolProfile_principalUserId_fkey"
  FOREIGN KEY ("principalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrincipalProfile" ADD CONSTRAINT "PrincipalProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrincipalProfile" ADD CONSTRAINT "PrincipalProfile_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GradeLevel" ADD CONSTRAINT "GradeLevel_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_gradeLevelId_fkey"
  FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_teacherProfileId_fkey"
  FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_classGroupId_fkey"
  FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentClassEnrollment" ADD CONSTRAINT "StudentClassEnrollment_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentClassEnrollment" ADD CONSTRAINT "StudentClassEnrollment_classGroupId_fkey"
  FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentChildLink" ADD CONSTRAINT "ParentChildLink_parentProfileId_fkey"
  FOREIGN KEY ("parentProfileId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentChildLink" ADD CONSTRAINT "ParentChildLink_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
