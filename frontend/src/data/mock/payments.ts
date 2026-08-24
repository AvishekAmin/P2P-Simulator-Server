import type { Payment } from "@/types/payment";
import { mockInvoices } from "./invoices";

export const mockPayments: Payment[] = [
  // --------------------------------------------------------------------------
  // Payment 1: [SUCCESS] Completed
  // --------------------------------------------------------------------------
  {
    id: "pay-demo-001",
    organizationId: "dev-org",
    invoiceId: "inv-demo-001",
    purchaseOrderId: "po-demo-001",
    amountPaise: 21476000, // ₹2,14,760
    currency: "INR",
    status: "COMPLETED",
    provider: "SIMULATED",
    providerReference: "SIM-TXN-99882201",
    processedAt: "2026-08-23T16:00:00.000Z",
    completedAt: "2026-08-23T16:01:30.000Z",
    createdAt: "2026-08-23T15:45:00.000Z",
    updatedAt: "2026-08-23T16:01:30.000Z",
    invoice: mockInvoices[0],
  },

  // --------------------------------------------------------------------------
  // Payment 2: [QTY MISMATCH] Blocked
  // --------------------------------------------------------------------------
  {
    id: "pay-demo-002",
    organizationId: "dev-org",
    invoiceId: "inv-demo-002",
    purchaseOrderId: "po-demo-002",
    amountPaise: 5310000, // ₹53,100
    currency: "INR",
    status: "BLOCKED",
    provider: "SIMULATED",
    blockedReason: "3-Way Match Check Failed: Received Quantity (98) does not match Invoiced Quantity (100). Payment disbursement blocked pending exception resolution.",
    createdAt: "2026-08-23T17:05:00.000Z",
    updatedAt: "2026-08-23T17:05:00.000Z",
    invoice: mockInvoices[1],
  },

  // --------------------------------------------------------------------------
  // Payment 3: [PRICE MISMATCH] Blocked
  // --------------------------------------------------------------------------
  {
    id: "pay-demo-003",
    organizationId: "dev-org",
    invoiceId: "inv-demo-003",
    purchaseOrderId: "po-demo-003",
    amountPaise: 11446000, // ₹1,14,460
    currency: "INR",
    status: "BLOCKED",
    provider: "SIMULATED",
    blockedReason: "3-Way Match Check Failed: Unit price mismatch (PO ₹8,400.00 vs Invoice ₹9,700.00). Variance +15.48% exceeds tolerance threshold.",
    createdAt: "2026-08-24T12:05:00.000Z",
    updatedAt: "2026-08-24T12:05:00.000Z",
    invoice: mockInvoices[2],
  },
];
