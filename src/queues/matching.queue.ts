import type { JobsOptions } from "bullmq";
import { QUEUE_NAMES } from "../config/constants.js";
import { type MatchingJob, matchingJobSchema } from "../types/types.js";
import { createQueue, enqueue } from "./connection.js";

export const matchingQueue = createQueue<MatchingJob>(QUEUE_NAMES.MATCHING);

export const MATCHING_JOBS = {
  RUN_THREE_WAY_MATCH: "run-three-way-match",
} as const;

export function enqueueMatching(payload: MatchingJob, opts?: JobsOptions): Promise<string> {
  return enqueue(
    matchingQueue,
    MATCHING_JOBS.RUN_THREE_WAY_MATCH,
    matchingJobSchema,
    payload,
    opts,
  );
}
