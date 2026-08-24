import { type Queue, QueueEvents } from "bullmq";
import { createRedisConnection } from "../config/redis.js";

/**
 * Lets a request block on a worker's result without doing the work in Express.
 *
 * Gemini is still only ever called inside the worker (CLAUDE.md rules 9 & 13) —
 * the API just waits for the answer so the chat endpoints can reply in one
 * round trip. Callers must handle the null (timed-out) case by returning 202
 * and letting the client poll.
 */

const eventsByQueue = new Map<string, QueueEvents>();

function getQueueEvents(queueName: string): QueueEvents {
  let events = eventsByQueue.get(queueName);
  if (!events) {
    // QueueEvents blocks on XREAD, so it needs a worker-style connection
    // (maxRetriesPerRequest: null), not the shared producer one.
    events = new QueueEvents(queueName, { connection: createRedisConnection() });
    eventsByQueue.set(queueName, events);
  }
  return events;
}

/**
 * Resolves with the job's return value, or null if it is still running after
 * `timeoutMs`. A job that *failed* rethrows, so genuine errors still surface.
 */
export async function awaitJobResult<T>(
  queue: Queue,
  jobId: string,
  timeoutMs: number,
): Promise<T | null> {
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const events = getQueueEvents(queue.name);
  await events.waitUntilReady();

  try {
    return (await job.waitUntilFinished(events, timeoutMs)) as T;
  } catch (error) {
    // waitUntilFinished rejects on timeout with a "timed out before finishing"
    // message; anything else is a real job failure and must propagate.
    if (error instanceof Error && /timed out/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

export async function closeQueueEvents(): Promise<void> {
  await Promise.all([...eventsByQueue.values()].map((events) => events.close()));
  eventsByQueue.clear();
}
