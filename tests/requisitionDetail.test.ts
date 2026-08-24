import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("../src/config/prisma.js", () => ({
  prisma: { requisition: { findFirst: (...args: unknown[]) => findFirst(...args) } },
  disconnectPrisma: vi.fn(),
}));

const { getRequisition } = await import("../src/services/requisition.service.js");

const ORG = "dev-org";
const REQ = "req-1";

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: "sup-techsource",
    rank: 1,
    eligible: true,
    ineligibleReason: null,
    unitPricePaise: 182_000,
    deliveryDays: 5,
    availableStock: 500,
    priceScore: 100,
    deliveryScore: 100,
    reliabilityScore: 95,
    ratingScore: 92,
    stockScore: 100,
    totalScore: 97.8,
    supplier: { id: "sup-techsource", name: "TechSource Distributors" },
    ...overrides,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: REQ,
    organizationId: ORG,
    rawInput: "100 wireless keyboards",
    status: "SUPPLIER_SELECTED",
    failureReason: null,
    clarificationMessage: null,
    missingFields: [],
    conflicts: [],
    draftRequirements: null,
    turnCount: 1,
    createdAt: new Date("2026-08-23T20:54:46.870Z"),
    updatedAt: new Date("2026-08-23T22:02:24.657Z"),
    requirement: null,
    messages: [],
    sourcingDecision: {
      selectedSupplierId: "sup-techsource",
      selectedSupplierProductId: "sp-keyboard-techsource",
      totalScore: 97.8,
      candidatesEvaluated: 3,
      rationale: "TechSource Distributors met every requirement.",
      createdAt: new Date("2026-08-23T22:02:24.576Z"),
    },
    supplierCandidates: [candidate()],
    purchaseOrder: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRequisition — sourcing view", () => {
  it("resolves the selected supplier's name from the ranked candidates", async () => {
    findFirst.mockResolvedValue(row());

    const detail = await getRequisition({ organizationId: ORG, requisitionId: REQ });

    // SourcingDecision.selectedSupplierId has no relation, so the name must be
    // joined server-side rather than left to the client.
    expect(detail.sourcing).toMatchObject({
      selectedSupplier: { id: "sup-techsource", name: "TechSource Distributors" },
      totalScore: 97.8,
      candidatesEvaluated: 3,
    });
  });

  it("flattens candidates into a render-ready shape, ineligible ones included", async () => {
    findFirst.mockResolvedValue(
      row({
        supplierCandidates: [
          candidate(),
          candidate({
            supplierId: "sup-budget-bulk",
            rank: 2,
            eligible: false,
            ineligibleReason: "Stock 40 is below the required 100",
            availableStock: 40,
            priceScore: 0,
            deliveryScore: 0,
            reliabilityScore: 0,
            ratingScore: 0,
            stockScore: 0,
            totalScore: 0,
            supplier: { id: "sup-budget-bulk", name: "BudgetBulk Traders" },
          }),
        ],
      }),
    );

    const detail = await getRequisition({ organizationId: ORG, requisitionId: REQ });

    expect(detail.supplierCandidates).toHaveLength(2);
    expect(detail.supplierCandidates[0]).toEqual({
      supplierId: "sup-techsource",
      supplierName: "TechSource Distributors",
      rank: 1,
      eligible: true,
      ineligibleReason: null,
      unitPricePaise: 182_000,
      deliveryDays: 5,
      availableStock: 500,
      scores: { price: 100, delivery: 100, reliability: 95, rating: 92, stock: 100, total: 97.8 },
    });
    expect(detail.supplierCandidates[1]).toMatchObject({
      supplierName: "BudgetBulk Traders",
      eligible: false,
      ineligibleReason: "Stock 40 is below the required 100",
    });
  });

  it("returns null sourcing and an empty candidate list before discovery runs", async () => {
    findFirst.mockResolvedValue(
      row({ status: "NEEDS_CLARIFICATION", sourcingDecision: null, supplierCandidates: [] }),
    );

    const detail = await getRequisition({ organizationId: ORG, requisitionId: REQ });

    expect(detail.sourcing).toBeNull();
    expect(detail.supplierCandidates).toEqual([]);
  });

  it("still reports the decision when a failed run left no matching candidate", async () => {
    // Defensive: the winner should always be among the candidates, but the name
    // must degrade to null rather than throwing.
    findFirst.mockResolvedValue(row({ supplierCandidates: [] }));

    const detail = await getRequisition({ organizationId: ORG, requisitionId: REQ });

    expect(detail.sourcing?.selectedSupplier).toEqual({ id: "sup-techsource", name: null });
  });

  it("exposes the failure reason and rejected candidates on a failed requisition", async () => {
    findFirst.mockResolvedValue(
      row({
        status: "FAILED",
        failureReason: "No supplier met every requirement: ...",
        sourcingDecision: null,
        supplierCandidates: [
          candidate({
            eligible: false,
            ineligibleReason: "Stock 3 is below the required 10",
            totalScore: 0,
          }),
        ],
      }),
    );

    const detail = await getRequisition({ organizationId: ORG, requisitionId: REQ });

    expect(detail.status).toBe("FAILED");
    expect(detail.failureReason).toContain("No supplier met every requirement");
    expect(detail.sourcing).toBeNull();
    expect(detail.supplierCandidates[0]?.ineligibleReason).toBe("Stock 3 is below the required 10");
  });

  it("stays tenant-scoped and 404s an unknown requisition", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getRequisition({ organizationId: ORG, requisitionId: REQ })).rejects.toThrow(
      /Requisition not found/,
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: REQ, organizationId: ORG } }),
    );
  });

  it("does not leak the raw relation rows", async () => {
    findFirst.mockResolvedValue(row());

    const detail = (await getRequisition({
      organizationId: ORG,
      requisitionId: REQ,
    })) as Record<string, unknown>;

    expect(detail).not.toHaveProperty("sourcingDecision");
    expect(detail).toHaveProperty("sourcing");
  });
});

describe("getRequisition — purchase order view", () => {
  it("inlines the purchase order so the frontend needs no second request", async () => {
    findFirst.mockResolvedValue(
      row({
        status: "PO_CREATED",
        purchaseOrder: {
          id: "po-1",
          poNumber: "PO-20260824-ABC123",
          status: "PENDING_APPROVAL",
          subtotalPaise: 18_200_000,
          taxPaise: 3_276_000,
          totalPaise: 21_476_000,
          supplier: { id: "sup-techsource", name: "TechSource Distributors" },
          items: [{ id: "poi-1", quantity: 100, unitPricePaise: 182_000 }],
        },
      }),
    );

    const detail = await getRequisition({ organizationId: ORG, requisitionId: REQ });

    expect(detail.status).toBe("PO_CREATED");
    expect(detail.purchaseOrder).toMatchObject({
      poNumber: "PO-20260824-ABC123",
      status: "PENDING_APPROVAL",
      totalPaise: 21_476_000,
      supplier: { name: "TechSource Distributors" },
    });
  });

  it("returns a null purchase order before one exists", async () => {
    findFirst.mockResolvedValue(row());

    const detail = await getRequisition({ organizationId: ORG, requisitionId: REQ });

    expect(detail.purchaseOrder).toBeNull();
  });
});
