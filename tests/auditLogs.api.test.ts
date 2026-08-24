import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/db";

const db = {
  organization: { findUnique: vi.fn() },
  auditLog: {
    findMany: vi.fn(),
  },
};

vi.mock("../src/config/prisma.js", () => ({
  prisma: { ...db },
  disconnectPrisma: vi.fn(),
}));

vi.mock("../src/config/redis.js", () => ({
  redis: { ping: vi.fn() },
  createRedisConnection: vi.fn(),
}));

const { createApp } = await import("../src/app.js");
const request = (await import("supertest")).default;

const ORG = "dev-org";

function buildAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-1",
    organizationId: ORG,
    actorType: "SYSTEM",
    actorId: null,
    action: "PO_CREATED",
    entityType: "PurchaseOrder",
    entityId: "po-1",
    metadata: null,
    createdAt: new Date("2026-08-24T00:00:00.000Z"),
    ...overrides,
  };
}

const app = createApp();
const list = (query = "") =>
  request(app).get(`/api/v1/audit-logs${query}`).set("x-organization-id", ORG);

beforeEach(() => {
  vi.clearAllMocks();
  db.organization.findUnique.mockResolvedValue({ id: ORG });
  db.auditLog.findMany.mockResolvedValue([]);
});

describe("GET /api/v1/audit-logs", () => {
  it("lists audit logs for the caller's organization, newest first", async () => {
    db.auditLog.findMany.mockResolvedValue([buildAuditLog()]);

    const res = await list();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.auditLogs).toHaveLength(1);
    expect(res.body.data.auditLogs[0].id).toBe("audit-1");
    expect(res.body.data.nextCursor).toBeNull();
    expect(db.auditLog.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });

  it("applies action, actorType, entityType and entityId filters", async () => {
    await list("?action=PAYMENT_COMPLETED&actorType=SYSTEM&entityType=Invoice&entityId=inv-1");

    expect(db.auditLog.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        organizationId: ORG,
        action: "PAYMENT_COMPLETED",
        actorType: "SYSTEM",
        entityType: "Invoice",
        entityId: "inv-1",
      },
    });
  });

  it("omits filters that were not supplied", async () => {
    await list();

    const call = db.auditLog.findMany.mock.calls[0];
    if (!call) {
      throw new Error("Expected findMany to have been called");
    }
    const { where } = call[0] as { where: Record<string, unknown> };
    expect(where).not.toHaveProperty("action");
    expect(where).not.toHaveProperty("actorType");
    expect(where).not.toHaveProperty("entityType");
    expect(where).not.toHaveProperty("entityId");
  });

  it("defaults limit to 20 and requests one extra row for pagination", async () => {
    await list();

    expect(db.auditLog.findMany.mock.calls[0]?.[0]).toMatchObject({ take: 21 });
  });

  it("returns a nextCursor when a page is full and forwards a supplied cursor", async () => {
    const page = Array.from({ length: 6 }, (_, i) => buildAuditLog({ id: `audit-${i}` }));
    db.auditLog.findMany.mockResolvedValue(page);

    const res = await list("?limit=5&cursor=audit-prev");

    expect(res.body.data.auditLogs).toHaveLength(5);
    expect(res.body.data.nextCursor).toBe("audit-4");
    expect(db.auditLog.findMany.mock.calls[0]?.[0]).toMatchObject({
      take: 6,
      cursor: { id: "audit-prev" },
      skip: 1,
    });
  });

  it("is scoped to the header organization, not any client-supplied one", async () => {
    await request(app)
      .get("/api/v1/audit-logs")
      .set("x-organization-id", ORG)
      .query({ organizationId: "some-other-org" });

    expect(db.auditLog.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { organizationId: ORG },
    });
  });

  it("rejects an unknown action", async () => {
    const res = await list("?action=NOPE");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown actorType", async () => {
    const res = await list("?actorType=NOPE");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown entityType", async () => {
    const res = await list("?entityType=NOPE");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a limit of zero", async () => {
    const res = await list("?limit=0");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a limit over 100", async () => {
    const res = await list("?limit=101");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("audit logs are immutable through the API", () => {
  it("has no POST handler", async () => {
    const res = await request(app)
      .post("/api/v1/audit-logs")
      .set("x-organization-id", ORG)
      .send({});
    expect(res.status).toBe(404);
  });

  it("has no PATCH handler", async () => {
    const res = await request(app)
      .patch("/api/v1/audit-logs/audit-1")
      .set("x-organization-id", ORG)
      .send({});
    expect(res.status).toBe(404);
  });

  it("has no DELETE handler", async () => {
    const res = await request(app)
      .delete("/api/v1/audit-logs/audit-1")
      .set("x-organization-id", ORG);
    expect(res.status).toBe(404);
  });
});
