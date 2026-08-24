-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'REQUISITION_CLARIFICATION_REQUESTED';

-- AlterTable
ALTER TABLE "Requisition" ADD COLUMN     "clarificationMessage" TEXT,
ADD COLUMN     "conflicts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "draftRequirements" JSONB,
ADD COLUMN     "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "turnCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RequisitionMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequisitionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequisitionMessage_requisitionId_createdAt_idx" ON "RequisitionMessage"("requisitionId", "createdAt");

-- CreateIndex
CREATE INDEX "RequisitionMessage_organizationId_idx" ON "RequisitionMessage"("organizationId");

-- AddForeignKey
ALTER TABLE "RequisitionMessage" ADD CONSTRAINT "RequisitionMessage_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
