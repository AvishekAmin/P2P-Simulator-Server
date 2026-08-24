import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/db";
// attachTenant reads this per request — it is the actor recorded on the audit row.
process.env.DEV_USER_ID ??= "dev-user";

const db = {
  organization: { findUnique: vi.fn() },
  purchaseOrder: { findFirst: vi.fn() },
  invoice: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  auditLog: { create: vi.fn() },
};

const transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    ...db,
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => transaction(fn),
  },
  disconnectPrisma: vi.fn(),
}));

vi.mock("../src/config/redis.js", () => ({
  redis: { ping: vi.fn() },
  createRedisConnection: vi.fn(),
}));

const upload = vi.fn();
const remove = vi.fn();

vi.mock("../src/storage/index.js", () => ({
  getStorageProvider: () => ({
    upload,
    download: vi.fn(),
    delete: remove,
    getUrl: vi.fn(),
  }),
}));

const enqueueInvoice = vi.fn();

vi.mock("../src/queues/invoice.queue.js", () => ({
  invoiceQueue: {},
  INVOICE_JOBS: { PROCESS_INVOICE: "process-invoice" },
  enqueueInvoice: (...args: unknown[]) => enqueueInvoice(...args),
}));

const { createApp } = await import("../src/app.js");
const { AppError } = await import("../src/utils/AppError.js");
const request = (await import("supertest")).default;

const ORG = "dev-org";
const PO = "po-1";
const PDF = Buffer.from("%PDF-1.4\nfake-pdf-content");

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    purchaseOrderId: PO,
    supplierId: "sup-techsource",
    status: "UPLOADED",
    fileUrl: "https://res.cloudinary.com/signed",
    fileMimeType: "application/pdf",
    fileSizeBytes: 2048,
    invoiceNumber: null,
    invoiceDate: null,
    supplierNameRaw: null,
    poNumberRaw: null,
    subtotalPaise: null,
    taxPaise: null,
    totalPaise: null,
    currency: null,
    extractedAt: null,
    extractionAttempts: 0,
    failureReason: null,
    createdAt: new Date("2026-08-24T00:00:00.000Z"),
    updatedAt: new Date("2026-08-24T00:00:00.000Z"),
    items: [],
    ...overrides,
  };
}

function post(app: ReturnType<typeof createApp>, file: Buffer | null = PDF) {
  const req = request(app)
    .post("/api/v1/invoices")
    .set("x-organization-id", ORG)
    .field("purchaseOrderId", PO);

  return file
    ? req.attach("file", file, { filename: "invoice.pdf", contentType: "application/pdf" })
    : req;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.organization.findUnique.mockResolvedValue({ id: ORG, name: "Dev Org" });
  db.purchaseOrder.findFirst.mockResolvedValue({
    id: PO,
    status: "APPROVED",
    supplierId: "sup-techsource",
  });
  db.invoice.create.mockResolvedValue(invoiceRow());
  db.auditLog.create.mockResolvedValue({});
  upload.mockResolvedValue({
    storageKey: "p2p/invoices/inv-1/invoice",
    url: "https://res.cloudinary.com/signed",
    bytes: 2048,
  });
  enqueueInvoice.mockResolvedValue("job-1");
});

describe("POST /api/v1/invoices", () => {
  it("stores the document, creates the invoice as UPLOADED and answers 202", async () => {
    const response = await post(createApp());

    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      success: true,
      error: null,
      data: { invoice: { id: "inv-1", status: "UPLOADED" } },
    });
  });

  it("enqueues the extraction job rather than doing OCR in the request", async () => {
    await post(createApp());

    expect(enqueueInvoice).toHaveBeenCalledWith({ invoiceId: "inv-1", organizationId: ORG });
  });

  it("keys the stored document on the id the invoice row is created with", async () => {
    await post(createApp());

    const uploadedId = upload.mock.calls[0]?.[0].invoiceId;
    expect(uploadedId).toBeTruthy();
    expect(db.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: uploadedId }) }),
    );
  });

  it("writes an INVOICE_UPLOADED audit row in the same transaction", async () => {
    await post(createApp());

    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "INVOICE_UPLOADED",
          entityType: "Invoice",
          actorType: "USER",
          actorId: "dev-user",
        }),
      }),
    );
  });

  it("rejects a request with no file", async () => {
    const response = await post(createApp(), null);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects a request with no purchaseOrderId", async () => {
    const response = await request(createApp())
      .post("/api/v1/invoices")
      .set("x-organization-id", ORG)
      .attach("file", PDF, { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(400);
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it("surfaces the storage layer's magic-byte rejection as a 400", async () => {
    // The declared MIME type is a lie; validateFile() inside the provider is
    // the authoritative check, so the failure arrives from upload().
    upload.mockRejectedValue(
      AppError.validation("File content does not match the declared type: application/pdf"),
    );

    const response = await post(createApp(), Buffer.from("this is plain text"));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(db.invoice.create).not.toHaveBeenCalled();
    expect(enqueueInvoice).not.toHaveBeenCalled();
  });

  it("404s a purchase order belonging to another organization", async () => {
    // findFirst is tenant-scoped, so a cross-tenant id simply finds nothing.
    db.purchaseOrder.findFirst.mockResolvedValue(null);

    const response = await post(createApp());

    expect(response.status).toBe(404);
    expect(upload).not.toHaveBeenCalled();
  });

  it("refuses to invoice a purchase order that is not yet approved", async () => {
    db.purchaseOrder.findFirst.mockResolvedValue({
      id: PO,
      status: "PENDING_APPROVAL",
      supplierId: "sup-techsource",
    });

    const response = await post(createApp());

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATE");
    expect(upload).not.toHaveBeenCalled();
  });

  it("deletes the uploaded document when the transaction fails", async () => {
    db.invoice.create.mockRejectedValue(new Error("connection lost"));

    const response = await post(createApp());

    expect(response.status).toBe(500);
    // Otherwise Cloudinary keeps a file no invoice row points at.
    expect(remove).toHaveBeenCalledWith("p2p/invoices/inv-1/invoice");
    expect(enqueueInvoice).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/invoices", () => {
  it("returns a tenant-scoped page", async () => {
    db.invoice.findMany.mockResolvedValue([invoiceRow()]);

    const response = await request(createApp())
      .get("/api/v1/invoices")
      .set("x-organization-id", ORG);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.nextCursor).toBeNull();
    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG }) }),
    );
  });

  it("404s an invoice owned by another organization", async () => {
    db.invoice.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get("/api/v1/invoices/inv-other")
      .set("x-organization-id", ORG);

    expect(response.status).toBe(404);
  });
});
