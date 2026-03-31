-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "parentName" TEXT,
ADD COLUMN     "parentPhone" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "ParentProfile" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "photoUrl" TEXT;
