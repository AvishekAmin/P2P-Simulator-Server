import { Redis, type RedisOptions } from "ioredis";

const BULLMQ_REDIS_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: 5,
  enableReadyCheck: true,
};

/**
 * Shared connection used by BullMQ Queue instances (producers) and by
 * ad-hoc readiness checks. Workers must not reuse this connection — BullMQ
 * Worker instances block the connection while waiting for jobs, so each
 * worker process should call createRedisConnection() for its own.
 */
export const redis = new Redis(process.env.REDIS_URL, BULLMQ_REDIS_OPTIONS);

export function createRedisConnection(): Redis {
  return new Redis(process.env.REDIS_URL, BULLMQ_REDIS_OPTIONS);
}
