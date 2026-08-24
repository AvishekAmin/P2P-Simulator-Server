-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "normalizedInvoiceNumber" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_organizationId_normalizedInvoiceNumber_idx" ON "Invoice"("organizationId", "normalizedInvoiceNumber");
