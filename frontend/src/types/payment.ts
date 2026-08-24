import type { PaymentStatus } from "./enums";
import type { Invoice } from "./invoice";

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  purchaseOrderId?: string | null;
  amountPaise: number;
  currency: string;
  status: PaymentStatus;
  provider: string; // e.g. "SIMULATED"
  providerReference?: string | null;
  blockedReason?: string | null;
  failureReason?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  invoice?: Invoice;
}
