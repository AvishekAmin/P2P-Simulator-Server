import type { JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "../config/constants.js";
import { type PurchaseOrderJob, purchaseOrderJobSchema } from "../types/types.js";
import { createQueue, enqueue } from "./connection.js";

export const purchaseOrderQueue = createQueue<PurchaseOrderJob>(QUEUE_NAMES.PURCHASE_ORDER);

export const PURCHASE_ORDER_JOBS = {
  CREATE_PURCHASE_ORDER: "create-purchase-order",
} as const;

export function enqueuePurchaseOrder(
  payload: PurchaseOrderJob,
  opts?: JobsOptions,
): Promise<string> {
  return enqueue(
    purchaseOrderQueue,
    PURCHASE_ORDER_JOBS.CREATE_PURCHASE_ORDER,
    purchaseOrderJobSchema,
    payload,
    opts,
  );
}
