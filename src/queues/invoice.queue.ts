import type { JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "../config/constants.js";
import { type InvoiceJob, invoiceJobSchema } from "../types/types.js";
import { createQueue, enqueue } from "./connection.js";

export const invoiceQueue = createQueue<InvoiceJob>(QUEUE_NAMES.INVOICE);

export const INVOICE_JOBS = {
  PROCESS_INVOICE: "process-invoice",
} as const;

export function enqueueInvoice(payload: InvoiceJob, opts?: JobsOptions): Promise<string> {
  return enqueue(invoiceQueue, INVOICE_JOBS.PROCESS_INVOICE, invoiceJobSchema, payload, opts);
}
