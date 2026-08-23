import type { JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "../config/constants.js";
import { type SupplierDiscoveryJob, supplierDiscoveryJobSchema } from "../types/types.js";
import { createQueue, enqueue } from "./connection.js";

export const supplierDiscoveryQueue = createQueue<SupplierDiscoveryJob>(
  QUEUE_NAMES.SUPPLIER_DISCOVERY,
);

export const SUPPLIER_DISCOVERY_JOBS = {
  DISCOVER_SUPPLIERS: "discover-suppliers",
} as const;

export function enqueueSupplierDiscovery(
  payload: SupplierDiscoveryJob,
  opts?: JobsOptions,
): Promise<string> {
  return enqueue(
    supplierDiscoveryQueue,
    SUPPLIER_DISCOVERY_JOBS.DISCOVER_SUPPLIERS,
    supplierDiscoveryJobSchema,
    payload,
    opts,
  );
}
