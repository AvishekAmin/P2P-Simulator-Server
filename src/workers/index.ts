import "../config/env.js";
import { type Processor, Worker } from "bullmq";
import type { QueueName } from "../config/constants.js";
import { disconnectPrisma } from "../config/prisma.js";
import { createRedisConnection } from "../config/redis.js";

const WORKER_CONCURRENCY = 5;

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
      concurrency: WORKER_CONCURRENCY,
    });

    worker.on("completed", (job) => {
      console.log(`Job ${job.id} on queue "${queueName}" completed.`);
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

const workers = startWorkers();

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down worker process...`);
  try {
    await Promise.all(workers.map((worker) => worker.close()));
    await disconnectPrisma();
    console.log("Worker process shut down cleanly.");
    process.exit(0);
  } catch (error) {
    console.error("Error during worker shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
