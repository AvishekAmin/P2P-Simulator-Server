import "./src/config/env.js";
import { prisma } from "./src/config/prisma.js";
import { enqueueMatching } from "./src/queues/matching.queue.js";
import { normalizeInvoiceNumber } from "./src/services/matching.service.js";

/**
 * Stands in for the invoice worker's Gemini Vision step only. Everything after
 * it — matching, exceptions, payment — runs for real off the queue.
 */
async function main() {
  const [invoiceId, poNumber, invoiceNumber, qtyRaw, unitRupeesRaw] = process.argv.slice(2);
  const quantity = Number(qtyRaw);
  const unitPricePaise = Math.round(Number(unitRupeesRaw) * 100);
  const subtotal = quantity * unitPricePaise;
  const tax = Math.round(subtotal * 0.18);

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { organizationId: true, purchaseOrder: { select: { supplier: { select: { name: true } }, items: { select: { description: true } } } } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "EXTRACTED",
        invoiceNumber,
        normalizedInvoiceNumber: normalizeInvoiceNumber(invoiceNumber),
        invoiceDate: new Date(),
        supplierNameRaw: invoice.purchaseOrder.supplier.name,
        poNumberRaw: poNumber,
        subtotalPaise: subtotal,
        taxPaise: tax,
        totalPaise: subtotal + tax,
        currency: "INR",
        extractedAt: new Date(),
        failureReason: null,
      },
    });
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    await tx.invoiceItem.create({
      data: {
        invoiceId,
        lineNumber: 1,
        description: invoice.purchaseOrder.items[0]!.description,
        quantity,
        unitPricePaise,
        lineTotalPaise: subtotal,
      },
    });
    // Clear the extraction exception so it does not pollute the payment gate.
    await tx.exception.updateMany({
      where: { entityId: invoiceId, type: "INVOICE_EXTRACTION_FAILED" },
      data: { status: "RESOLVED", resolution: "APPROVE", resolutionReason: "Re-seeded for e2e", resolvedAt: new Date() },
    });
  });

  const jobId = await enqueueMatching({ invoiceId, organizationId: invoice.organizationId });
  console.log(`seeded EXTRACTED (qty=${quantity} @ ${unitPricePaise}p) and enqueued matching job ${jobId}`);
  await prisma.$disconnect();
  process.exit(0);
}
main();
