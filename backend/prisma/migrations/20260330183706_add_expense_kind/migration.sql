-- AlterEnum
ALTER TYPE "FinancialKind" ADD VALUE 'EXPENSE';

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "links" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "contact" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT;
