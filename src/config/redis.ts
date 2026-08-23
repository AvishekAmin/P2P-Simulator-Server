import { Redis, type RedisOptions } from "ioredis";

const PRODUCER_REDIS_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: 5,
  enableReadyCheck: true,
};

const WORKER_REDIS_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
};

/**
 * Shared connection used by BullMQ Queue instances (producers) and by
 * ad-hoc readiness checks. Workers must not reuse this connection.
 * worker process should call createRedisConnection() for its own.
 */
export const redis = new Redis(process.env.REDIS_URL, PRODUCER_REDIS_OPTIONS);

export function createRedisConnection(): Redis {
  return new Redis(process.env.REDIS_URL, WORKER_REDIS_OPTIONS);
}
