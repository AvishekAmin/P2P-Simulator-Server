import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/db";

const queryRawMock = vi.fn();
const pingMock = vi.fn();

vi.mock("../src/config/prisma.js", () => ({
  prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) },
  disconnectPrisma: vi.fn(),
}));

vi.mock("../src/config/redis.js", () => ({
  redis: { ping: (...args: unknown[]) => pingMock(...args) },
  createRedisConnection: vi.fn(),
}));

const { createApp } = await import("../src/app.js");
const request = (await import("supertest")).default;

describe("health endpoints", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    pingMock.mockReset();
  });

  it("GET /health always returns 200 without checking dependencies", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(pingMock).not.toHaveBeenCalled();
  });

  it("GET /ready returns 200 when all dependencies are reachable", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    pingMock.mockResolvedValue("PONG");

    const app = createApp();
    const res = await request(app).get("/ready");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.dependencies.database.status).toBe("ok");
    expect(res.body.data.dependencies.redis.status).toBe("ok");
  });

  it("GET /ready returns 503 when a dependency fails", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    pingMock.mockRejectedValue(new Error("connection refused"));

    const app = createApp();
    const res = await request(app).get("/ready");

    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe("degraded");
    expect(res.body.data.dependencies.redis.status).toBe("error");
  });

  it("returns a 404 error envelope for unmatched routes", async () => {
    const app = createApp();
    const res = await request(app).get("/nope");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
