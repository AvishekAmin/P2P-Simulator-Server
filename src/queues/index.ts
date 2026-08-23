import { Queue } from "bullmq";
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES, type QueueName } from "../config/constants.js";
import { redis } from "../config/redis.js";
import type {
  InvoiceJob,
  MatchingJob,
  PaymentJob,
  PurchaseOrderJob,
  RequisitionJob,
  SupplierDiscoveryJob,
} from "../types/types.js";

function createQueue<T>(name: QueueName): Queue<T> {
  return new Queue<T>(name, {
    connection: redis,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export const QUEUES = {
  requisition: createQueue<RequisitionJob>(QUEUE_NAMES.REQUISITION),
  supplierDiscovery: createQueue<SupplierDiscoveryJob>(QUEUE_NAMES.SUPPLIER_DISCOVERY),
  purchaseOrder: createQueue<PurchaseOrderJob>(QUEUE_NAMES.PURCHASE_ORDER),
  invoice: createQueue<InvoiceJob>(QUEUE_NAMES.INVOICE),
  matching: createQueue<MatchingJob>(QUEUE_NAMES.MATCHING),
  payment: createQueue<PaymentJob>(QUEUE_NAMES.PAYMENT),
} as const;

export async function closeQueues(): Promise<void> {
  await Promise.all(Object.values(QUEUES).map((queue) => queue.close()));
}
