import { z } from "zod";

export const shipmentIdParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * One physically received purchase-order line. `damagedQuantity` is a subset of
 * `receivedQuantity` — units that arrived but cannot be accepted.
 */
const receiptLineSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  receivedQuantity: z.number().int().nonnegative(),
  damagedQuantity: z.number().int().nonnegative().default(0),
});

/**
 * Simulated IoT goods receipt.
 *
 * Two shapes, never both: the flat form for the single-line purchase orders the
 * MVP generates, and an explicit `items[]` for a multi-line purchase order — the
 * shape a real IoT integration would post.
 */
export const simulateReceiptSchema = z
  .object({
    shipmentId: z.string().min(1),
    receivedQuantity: z.number().int().nonnegative().optional(),
    damagedQuantity: z.number().int().nonnegative().optional(),
    items: z.array(receiptLineSchema).min(1).optional(),
    receivedBy: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => (value.items === undefined) !== (value.receivedQuantity === undefined), {
    message: "Provide either receivedQuantity (single-line purchase order) or items[], not both",
    path: ["items"],
  })
  .refine((value) => value.items === undefined || value.damagedQuantity === undefined, {
    message: "damagedQuantity belongs on each entry of items[]",
    path: ["damagedQuantity"],
  });

export type SimulateReceiptInput = z.infer<typeof simulateReceiptSchema>;
