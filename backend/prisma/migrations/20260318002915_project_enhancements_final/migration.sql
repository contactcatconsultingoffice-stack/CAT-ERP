/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('A_CONTACTER', 'CONTACTE', 'REPONDU', 'EN_DISCUSSION', 'CONFIRME');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'READY_TO_SEND';
ALTER TYPE "PaymentStatus" ADD VALUE 'SENT';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "FinancialRecord" ADD COLUMN     "lines" JSONB,
ADD COLUMN     "paymentTerms" TEXT;

-- AlterTable
ALTER TABLE "Mission" ALTER COLUMN "hours" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "reference" TEXT;

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "status" "ProspectStatus" NOT NULL DEFAULT 'A_CONTACTER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_reference_key" ON "Project"("reference");
