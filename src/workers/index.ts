import "../config/env.js";
import { type Processor, Worker } from "bullmq";
import type { QueueName } from "../config/constants.js";
import { createRedisConnection } from "../config/redis.js";

// Register a processor here as each queue's business logic is implemented,
// e.g. { [QUEUE_NAMES.REQUISITION]: processRequisitionJob }. Empty for now —
// this phase only stands up the worker process shell.
const PROCESSORS: Partial<Record<QueueName, Processor>> = {};

function startWorkers(): Worker[] {
  const entries = Object.entries(PROCESSORS) as [QueueName, Processor][];

  console.log(`Starting worker process: ${entries.length} processor(s) registered.`);

  return entries.map(([queueName, processor]) => {
    const worker = new Worker(queueName, processor, {
      connection: createRedisConnection(),
    });

    worker.on("failed", (job, error) => {
      console.error(`Job ${job?.id} on queue "${queueName}" failed:`, error);
    });

    worker.on("error", (error) => {
      console.error(`Worker error on queue "${queueName}":`, error);
    });

    return worker;
  });
}

startWorkers();
