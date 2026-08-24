import { z } from "zod";
import { PurchaseOrderStatus } from "../generated/prisma/enums.js";

export const purchaseOrderIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listPurchaseOrdersQuerySchema = z.object({
  status: z.enum(PurchaseOrderStatus).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().min(1).optional(),
});
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;

/** Rejection always needs a reason — it is written to the audit trail and shown to the buyer. */
export const rejectPurchaseOrderSchema = z.object({
  reason: z.string().trim().min(1, "A rejection reason is required").max(500),
});
export type RejectPurchaseOrderInput = z.infer<typeof rejectPurchaseOrderSchema>;
