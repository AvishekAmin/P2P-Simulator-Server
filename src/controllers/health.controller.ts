import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { sendSuccess } from "../utils/response.js";
import { withTimeout } from "../utils/withTimeout.js";

const DEPENDENCY_TIMEOUT_MS = 2000;

interface DependencyCheck {
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}

async function checkDependency(check: () => Promise<unknown>): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    await withTimeout(check(), DEPENDENCY_TIMEOUT_MS);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Liveness: process is up and can respond. No dependency calls — a slow or
// unreachable Postgres/Redis must never make the load balancer restart us.
export function getHealth(_req: Request, res: Response): void {
  sendSuccess(res, {
    status: "ok",
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? "0.0.0",
    timestamp: new Date().toISOString(),
  });
}

// Readiness: are our dependencies actually reachable right now. Used to
// gate traffic (e.g. behind a load balancer), so this one is allowed, and
// expected, to fail.
export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const [database, redisCheck] = await Promise.all([
    checkDependency(() => prisma.$queryRaw`SELECT 1`),
    checkDependency(() => redis.ping()),
  ]);

  const dependencies = { database, redis: redisCheck };
  const allOk = Object.values(dependencies).every((dep) => dep.status === "ok");

  sendSuccess(res, { status: allOk ? "ok" : "degraded", dependencies }, allOk ? 200 : 503);
}
