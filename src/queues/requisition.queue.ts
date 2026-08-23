import type { JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "../config/constants.js";
import { type RequisitionJob, requisitionJobSchema } from "../types/types.js";
import { createQueue, enqueue } from "./connection.js";

export const requisitionQueue = createQueue<RequisitionJob>(QUEUE_NAMES.REQUISITION);

export const REQUISITION_JOBS = {
  EXTRACT_REQUIREMENTS: "extract-requirements",
} as const;

export function enqueueRequisition(payload: RequisitionJob, opts?: JobsOptions): Promise<string> {
  return enqueue(
    requisitionQueue,
    REQUISITION_JOBS.EXTRACT_REQUIREMENTS,
    requisitionJobSchema,
    payload,
    opts,
  );
}
