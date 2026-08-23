import type { JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "../config/constants.js";
import { type PaymentJob, paymentJobSchema } from "../types/types.js";
import { createQueue, enqueue } from "./connection.js";

export const paymentQueue = createQueue<PaymentJob>(QUEUE_NAMES.PAYMENT);

export const PAYMENT_JOBS = {
  PROCESS_PAYMENT: "process-payment",
} as const;

export function enqueuePayment(payload: PaymentJob, opts?: JobsOptions): Promise<string> {
  return enqueue(paymentQueue, PAYMENT_JOBS.PROCESS_PAYMENT, paymentJobSchema, payload, opts);
}
