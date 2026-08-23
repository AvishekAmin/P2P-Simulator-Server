import { z } from "zod";

// Job payloads carry IDs only (CLAUDE.md §24) — workers fetch current state
// from PostgreSQL rather than trusting queued data.

export const requisitionJobSchema = z.object({
  requisitionId: z.string(),
  organizationId: z.string(),
});
export type RequisitionJob = z.infer<typeof requisitionJobSchema>;

export const supplierDiscoveryJobSchema = z.object({
  requisitionId: z.string(),
  organizationId: z.string(),
});
export type SupplierDiscoveryJob = z.infer<typeof supplierDiscoveryJobSchema>;

export const purchaseOrderJobSchema = z.object({
  requisitionId: z.string(),
  organizationId: z.string(),
});
export type PurchaseOrderJob = z.infer<typeof purchaseOrderJobSchema>;

export const invoiceJobSchema = z.object({
  invoiceId: z.string(),
  organizationId: z.string(),
});
export type InvoiceJob = z.infer<typeof invoiceJobSchema>;

export const matchingJobSchema = z.object({
  invoiceId: z.string(),
  organizationId: z.string(),
});
export type MatchingJob = z.infer<typeof matchingJobSchema>;

export const paymentJobSchema = z.object({
  invoiceId: z.string(),
  organizationId: z.string(),
});
export type PaymentJob = z.infer<typeof paymentJobSchema>;
