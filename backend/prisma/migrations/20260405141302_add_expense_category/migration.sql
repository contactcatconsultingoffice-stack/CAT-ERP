-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('LOGICIELS_SAAS', 'DEPLACEMENTS', 'SOUS_TRAITANCE', 'MARKETING', 'SALAIRES', 'OPERATIONNEL');

-- DropForeignKey
ALTER TABLE "FinancialRecord" DROP CONSTRAINT "FinancialRecord_projectId_fkey";

-- AlterTable
ALTER TABLE "FinancialRecord" ADD COLUMN     "expenseCategory" "ExpenseCategory",
ALTER COLUMN "projectId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
