-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "normalizedInvoiceNumber" TEXT;

-- BackfillNormalizedInvoiceNumber
UPDATE "Invoice"
SET "normalizedInvoiceNumber" = regexp_replace(LOWER("invoiceNumber"), '[^a-z0-9]', '', 'g')
WHERE "invoiceNumber" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Invoice_organizationId_normalizedInvoiceNumber_idx" ON "Invoice"("organizationId", "normalizedInvoiceNumber");
