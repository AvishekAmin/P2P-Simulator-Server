import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RankedCandidate } from "../src/rules/supplierRanking.js";

// Gemini is always mocked — CLAUDE.md forbids tests depending on live AI.
const generateStructured = vi.fn();
const aiLogCreate = vi.fn().mockResolvedValue({ id: "log-1" });

vi.mock("../src/ai/index.js", () => ({
  AI_MODEL: "gemini-test",
  getAIProvider: () => ({ generateStructured, analyzeDocument: vi.fn() }),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: { aIProcessingLog: { create: (...args: unknown[]) => aiLogCreate(...args) } },
  disconnectPrisma: vi.fn(),
}));

const { generateRationale } = await import("../src/services/sourcing.service.js");

const SELECTED: RankedCandidate = {
  supplierId: "sup-techsource",
  supplierName: "TechSource Distributors",
  supplierProductId: "sp-keyboard-techsource",
  eligible: true,
  ineligibleReason: null,
  priceScore: 100,
  deliveryScore: 100,
  reliabilityScore: 95,
  ratingScore: 92,
  stockScore: 100,
  totalScore: 97.8,
  rank: 1,
  unitPricePaise: 182_000,
  deliveryDays: 5,
  availableStock: 500,
};

const RUNNER_UP: RankedCandidate = {
  ...SELECTED,
  supplierId: "sup-budget-bulk",
  supplierName: "BudgetBulk Traders",
  supplierProductId: "sp-keyboard-budget",
  eligible: false,
  ineligibleReason: "Stock 40 is below the required 100",
  priceScore: 0,
  deliveryScore: 0,
  reliabilityScore: 0,
  ratingScore: 0,
  stockScore: 0,
  totalScore: 0,
  rank: 2,
  unitPricePaise: 170_000,
  availableStock: 40,
};

function run() {
  return generateRationale({
    organizationId: "dev-org",
    requisitionId: "req-1",
    productName: "Wireless Keyboard",
    quantity: 100,
    currency: "INR",
    maxUnitPricePaise: 200_000,
    deliveryDeadlineDays: 7,
    candidates: [SELECTED, RUNNER_UP],
    selected: SELECTED,
    evaluatedCount: 3,
    eligibleCount: 1,
  });
}

/** The deterministic text buildRationale() produces for SELECTED. */
const FALLBACK_MARKER = "selected with a score of 97.8/100";

beforeEach(() => {
  vi.clearAllMocks();
  aiLogCreate.mockResolvedValue({ id: "log-1" });
});

describe("generateRationale", () => {
  it("stores a usable Gemini explanation verbatim", async () => {
    const rationale =
      "Although BudgetBulk Traders quote a lower price, they hold only 40 units against the 100 required. TechSource Distributors meet every requirement and deliver in five days.";
    generateStructured.mockResolvedValue(JSON.stringify({ rationale }));

    await expect(run()).resolves.toBe(rationale);
    expect(aiLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
          jobType: "generate-sourcing-rationale",
          promptVersion: "sourcing.v1",
          entityId: "req-1",
        }),
      }),
    );
  });

  it("sends only the top three candidates, with money pre-formatted", async () => {
    generateStructured.mockResolvedValue(
      JSON.stringify({ rationale: "TechSource Distributors were chosen." }),
    );

    await run();

    const call = generateStructured.mock.calls[0]?.[0] as { userPrompt: string } | undefined;
    const userPrompt = call?.userPrompt ?? "";

    expect(userPrompt).toContain("₹1,820.00");
    // Raw paise must never reach the model.
    expect(userPrompt).not.toContain("182000");
    expect(userPrompt).toContain("Stock 40 is below the required 100");
  });

  it("never presents an unscored supplier as having zero reliability or rating", async () => {
    generateStructured.mockResolvedValue(
      JSON.stringify({ rationale: "TechSource Distributors were chosen." }),
    );

    await run();

    const call = generateStructured.mock.calls[0]?.[0] as { userPrompt: string } | undefined;
    const userPrompt = call?.userPrompt ?? "";

    // Ineligible candidates are never scored, so their zeros are placeholders,
    // not measurements — sending them would defame a real supplier.
    expect(userPrompt).not.toContain("0 out of 100");
    expect(userPrompt).not.toContain("0.0 out of 5");
    // The winner's real figures are still sent.
    expect(userPrompt).toContain("95 out of 100");
    expect(userPrompt).toContain("4.6 out of 5");
  });

  it("falls back deterministically when Gemini is unavailable", async () => {
    generateStructured.mockRejectedValue(new Error("Gemini request timed out"));

    await expect(run()).resolves.toContain(FALLBACK_MARKER);
    expect(aiLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, error: "Gemini request timed out" }),
      }),
    );
  });

  it("falls back on malformed JSON", async () => {
    generateStructured.mockResolvedValue("not json at all");
    await expect(run()).resolves.toContain(FALLBACK_MARKER);
  });

  it("falls back when the response fails schema validation", async () => {
    generateStructured.mockResolvedValue(JSON.stringify({ explanation: "wrong key" }));
    await expect(run()).resolves.toContain(FALLBACK_MARKER);

    generateStructured.mockResolvedValue(JSON.stringify({ rationale: "" }));
    await expect(run()).resolves.toContain(FALLBACK_MARKER);
  });

  it("rejects an explanation that never names the selected supplier", async () => {
    generateStructured.mockResolvedValue(
      JSON.stringify({ rationale: "The cheapest available option was chosen." }),
    );
    await expect(run()).resolves.toContain(FALLBACK_MARKER);
    expect(aiLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          error: "Gemini rationale failed the sanity check",
        }),
      }),
    );
  });

  it("accepts the plain business English the prompt asks for", async () => {
    // The prompt tells the model to state exclusion reasons in plain words, so
    // words like "eligible" and "delivery days" must not trip the leak check.
    const rationale =
      "BudgetBulk Traders were not eligible because their stock was short, and Global Office Supplies needed more delivery days than allowed, so TechSource Distributors were chosen.";
    generateStructured.mockResolvedValue(JSON.stringify({ rationale }));

    await expect(run()).resolves.toBe(rationale);
  });

  it("rejects an explanation that leaks internal field names", async () => {
    generateStructured.mockResolvedValue(
      JSON.stringify({
        rationale: "TechSource Distributors won with the best unitPricePaise and totalScore.",
      }),
    );
    await expect(run()).resolves.toContain(FALLBACK_MARKER);
  });

  it("never throws, whatever the model does", async () => {
    for (const behaviour of [
      () => generateStructured.mockRejectedValue(new Error("boom")),
      () => generateStructured.mockRejectedValue("a non-Error rejection"),
      () => generateStructured.mockResolvedValue(""),
      () => generateStructured.mockResolvedValue("null"),
      () => generateStructured.mockResolvedValue(JSON.stringify({ rationale: "x".repeat(5000) })),
    ]) {
      behaviour();
      await expect(run()).resolves.toContain(FALLBACK_MARKER);
    }
  });

  it("survives a failed AIProcessingLog write", async () => {
    aiLogCreate.mockRejectedValue(new Error("database unavailable"));
    generateStructured.mockResolvedValue(
      JSON.stringify({ rationale: "TechSource Distributors were chosen." }),
    );

    await expect(run()).resolves.toBe("TechSource Distributors were chosen.");
  });
});
