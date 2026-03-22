-- Drop unique constraints on pin fields so bcrypt hashes can be stored
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_pin_key";
ALTER TABLE "Teacher" DROP CONSTRAINT IF EXISTS "Teacher_pin_key";
ALTER TABLE "Admin" DROP CONSTRAINT IF EXISTS "Admin_pin_key";
