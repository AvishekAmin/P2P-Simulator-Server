import { describe, expect, it } from "vitest";
import {
  buildRationale,
  checkEligibility,
  rankSuppliers,
  type SourcingConstraints,
  type SupplierOffer,
} from "../src/rules/supplierRanking.js";

const CONSTRAINTS: SourcingConstraints = {
  quantity: 100,
  currency: "INR",
  maxUnitPricePaise: 200_000,
  deliveryDeadlineDays: 7,
};

function offer(overrides: Partial<SupplierOffer> & { supplierId: string }): SupplierOffer {
  return {
    supplierName: `Supplier ${overrides.supplierId}`,
    supplierProductId: `sp-${overrides.supplierId}`,
    unitPricePaise: 180_000,
    currency: "INR",
    stockQuantity: 500,
    deliveryDays: 5,
    minOrderQuantity: 1,
    isActive: true,
    rating: 4,
    reliabilityScore: 0.9,
    ...overrides,
  };
}

// Three eligible suppliers whose scores are hand-computable end to end.
const ALPHA = offer({
  supplierId: "alpha",
  unitPricePaise: 180_000,
  deliveryDays: 4,
  stockQuantity: 500,
  rating: 4,
  reliabilityScore: 0.9,
});
const BRAVO = offer({
  supplierId: "bravo",
  unitPricePaise: 190_000,
  deliveryDays: 6,
  stockQuantity: 300,
  rating: 5,
  reliabilityScore: 1,
});
const CHARLIE = offer({
  supplierId: "charlie",
  unitPricePaise: 200_000,
  deliveryDays: 5,
  stockQuantity: 100,
  rating: 3,
  reliabilityScore: 0.8,
});

describe("checkEligibility", () => {
  it("accepts a supplier that meets every constraint", () => {
    expect(checkEligibility(ALPHA, CONSTRAINTS)).toBeNull();
  });

  it("rejects insufficient stock", () => {
    const reason = checkEligibility(offer({ supplierId: "s", stockQuantity: 40 }), CONSTRAINTS);
    expect(reason).toBe("Stock 40 is below the required 100");
  });

  it("rejects a unit price above the maximum, quoting both figures", () => {
    const reason = checkEligibility(
      offer({ supplierId: "s", unitPricePaise: 250_000 }),
      CONSTRAINTS,
    );
    expect(reason).toBe("Unit price ₹2,500.00 exceeds the ₹2,000.00 maximum");
  });

  it("accepts a unit price exactly at the maximum", () => {
    expect(
      checkEligibility(offer({ supplierId: "s", unitPricePaise: 200_000 }), CONSTRAINTS),
    ).toBeNull();
  });

  it("rejects delivery beyond the deadline", () => {
    const reason = checkEligibility(offer({ supplierId: "s", deliveryDays: 8 }), CONSTRAINTS);
    expect(reason).toBe("Delivery in 8 days exceeds the 7-day deadline");
  });

  it("accepts delivery exactly on the deadline", () => {
    expect(checkEligibility(offer({ supplierId: "s", deliveryDays: 7 }), CONSTRAINTS)).toBeNull();
  });

  it("rejects an order below the supplier's minimum", () => {
    const reason = checkEligibility(offer({ supplierId: "s", minOrderQuantity: 500 }), CONSTRAINTS);
    expect(reason).toBe("Minimum order of 500 exceeds the requested 100");
  });

  it("rejects an inactive supplier", () => {
    expect(checkEligibility(offer({ supplierId: "s", isActive: false }), CONSTRAINTS)).toBe(
      "Supplier is inactive",
    );
  });

  it("rejects a differently denominated quote rather than converting it", () => {
    const reason = checkEligibility(
      offer({ supplierId: "s", currency: "USD", unitPricePaise: 2_000 }),
      CONSTRAINTS,
    );
    expect(reason).toBe("Quotes in USD, requirement is in INR");
  });

  it("treats a null budget and a null deadline as unconstrained", () => {
    const unconstrained: SourcingConstraints = {
      ...CONSTRAINTS,
      maxUnitPricePaise: null,
      deliveryDeadlineDays: null,
    };
    const expensiveAndSlow = offer({
      supplierId: "s",
      unitPricePaise: 99_999_999,
      deliveryDays: 365,
    });
    expect(checkEligibility(expensiveAndSlow, unconstrained)).toBeNull();
  });
});

describe("rankSuppliers", () => {
  it("ranks eligible suppliers by their weighted score", () => {
    const ranked = rankSuppliers([ALPHA, BRAVO, CHARLIE], CONSTRAINTS);

    expect(ranked.map((c) => c.supplierId)).toEqual(["alpha", "bravo", "charlie"]);
    expect(ranked.map((c) => c.rank)).toEqual([1, 2, 3]);
    expect(ranked.every((c) => c.eligible)).toBe(true);

    // price 180000/190000/200000 -> 100/50/0
    expect(ranked.map((c) => c.priceScore)).toEqual([100, 50, 0]);
    // delivery 4/6/5 days -> 100/0/50
    expect(ranked.map((c) => c.deliveryScore)).toEqual([100, 0, 50]);
    // stock 500/300/100 -> 100/50/0
    expect(ranked.map((c) => c.stockScore)).toEqual([100, 50, 0]);
    // reliability 0.9/1.0/0.8 -> x100
    expect(ranked.map((c) => c.reliabilityScore)).toEqual([90, 100, 80]);
    // rating 4/5/3 out of 5 -> x20
    expect(ranked.map((c) => c.ratingScore)).toEqual([80, 100, 60]);

    // 30% / 25% / 20% / 15% / 10%
    expect(ranked.map((c) => c.totalScore)).toEqual([95, 55, 37.5]);
  });

  it("keeps each total reconcilable with its five stored components", () => {
    for (const c of rankSuppliers([ALPHA, BRAVO, CHARLIE], CONSTRAINTS)) {
      const recomputed =
        c.priceScore * 0.3 +
        c.deliveryScore * 0.25 +
        c.reliabilityScore * 0.2 +
        c.ratingScore * 0.15 +
        c.stockScore * 0.1;
      expect(c.totalScore).toBeCloseTo(recomputed, 10);
    }
  });

  it("copies the offer's raw figures onto the candidate", () => {
    const [first] = rankSuppliers([ALPHA], CONSTRAINTS);
    expect(first).toMatchObject({
      supplierProductId: "sp-alpha",
      unitPricePaise: 180_000,
      deliveryDays: 4,
      availableStock: 500,
      ineligibleReason: null,
    });
  });

  it("does not let an ineligible bargain deflate the eligible price scores", () => {
    // Cheap enough to become the new minimum, but only 10 units in stock.
    const bargain = offer({ supplierId: "zulu", unitPricePaise: 10_000, stockQuantity: 10 });
    const ranked = rankSuppliers([ALPHA, BRAVO, CHARLIE, bargain], CONSTRAINTS);

    const alpha = ranked.find((c) => c.supplierId === "alpha");
    expect(alpha?.priceScore).toBe(100);
    expect(alpha?.totalScore).toBe(95);

    const rejected = ranked.find((c) => c.supplierId === "zulu");
    expect(rejected).toMatchObject({ eligible: false, rank: 4, priceScore: 0, totalScore: 0 });
  });

  it("ranks every ineligible supplier after every eligible one", () => {
    const slow = offer({ supplierId: "delta", deliveryDays: 9 });
    const short = offer({ supplierId: "echo", stockQuantity: 5 });
    const ranked = rankSuppliers([slow, ALPHA, short, BRAVO], CONSTRAINTS);

    expect(ranked.map((c) => c.supplierId)).toEqual(["alpha", "bravo", "delta", "echo"]);
    expect(ranked.map((c) => c.eligible)).toEqual([true, true, false, false]);
    expect(ranked.map((c) => c.rank)).toEqual([1, 2, 3, 4]);
  });

  it("returns every candidate ineligible and zero-scored when nobody qualifies", () => {
    const tooSlow = offer({ supplierId: "b", deliveryDays: 12 });
    const tooLittle = offer({ supplierId: "a", stockQuantity: 3 });
    const tooDear = offer({ supplierId: "c", unitPricePaise: 900_000 });

    const ranked = rankSuppliers([tooSlow, tooLittle, tooDear], CONSTRAINTS);

    expect(ranked).toHaveLength(3);
    expect(ranked.every((c) => !c.eligible)).toBe(true);
    expect(ranked.every((c) => c.totalScore === 0)).toBe(true);
    expect(ranked.every((c) => c.ineligibleReason !== null)).toBe(true);
    // Ineligible rows are ordered by supplierId, and still ranked 1..n.
    expect(ranked.map((c) => c.supplierId)).toEqual(["a", "b", "c"]);
    expect(ranked.map((c) => c.rank)).toEqual([1, 2, 3]);
  });

  it("gives a lone eligible candidate full marks on the peer-relative dimensions", () => {
    const [only] = rankSuppliers([ALPHA], CONSTRAINTS);

    expect(only).toMatchObject({ priceScore: 100, deliveryScore: 100, stockScore: 100 });
    // Reliability and rating stay on their absolute scales.
    expect(only?.reliabilityScore).toBe(90);
    expect(only?.ratingScore).toBe(80);
    expect(only?.totalScore).toBe(30 + 25 + 18 + 12 + 10);
  });

  it("breaks a dead heat by supplier id", () => {
    const ranked = rankSuppliers(
      [
        offer({ supplierId: "zeta" }),
        offer({ supplierId: "alpha" }),
        offer({ supplierId: "mike" }),
      ],
      CONSTRAINTS,
    );

    // 100 price + 100 delivery + 90 reliability + 80 rating + 100 stock.
    expect(ranked.map((c) => c.totalScore)).toEqual([95, 95, 95]);
    expect(ranked.map((c) => c.supplierId)).toEqual(["alpha", "mike", "zeta"]);
  });

  it("prefers the cheaper supplier when totals tie, ahead of the id tie-break", () => {
    // Constructed so the price advantage exactly offsets the quality advantage:
    // cheap = 30 + 25 + 5 + 0 + 10, dear = 0 + 25 + 20 + 15 + 10. Both 70.
    const cheap = offer({
      supplierId: "zulu",
      unitPricePaise: 100_000,
      reliabilityScore: 0.25,
      rating: 0,
    });
    const dear = offer({
      supplierId: "alpha",
      unitPricePaise: 200_000,
      reliabilityScore: 1,
      rating: 5,
    });
    const ranked = rankSuppliers([dear, cheap], CONSTRAINTS);

    expect(ranked.map((c) => c.totalScore)).toEqual([70, 70]);
    // "zulu" sorts last alphabetically, so this can only be the price tie-break.
    expect(ranked[0]?.supplierId).toBe("zulu");
  });

  it("clamps out-of-range ratings and reliability scores", () => {
    const [only] = rankSuppliers(
      [offer({ supplierId: "s", rating: 9, reliabilityScore: 2 })],
      CONSTRAINTS,
    );
    expect(only?.ratingScore).toBe(100);
    expect(only?.reliabilityScore).toBe(100);
  });

  it("returns an empty list for an empty catalog", () => {
    expect(rankSuppliers([], CONSTRAINTS)).toEqual([]);
  });

  it("is deterministic regardless of input order", () => {
    const bargain = offer({ supplierId: "zulu", unitPricePaise: 10_000, stockQuantity: 10 });
    const inputs = [ALPHA, BRAVO, CHARLIE, bargain];

    const baseline = JSON.stringify(rankSuppliers(inputs, CONSTRAINTS));

    for (const permutation of [
      [bargain, CHARLIE, BRAVO, ALPHA],
      [BRAVO, bargain, ALPHA, CHARLIE],
      [CHARLIE, ALPHA, bargain, BRAVO],
    ]) {
      expect(JSON.stringify(rankSuppliers(permutation, CONSTRAINTS))).toBe(baseline);
    }
  });
});

describe("buildRationale", () => {
  it("names the supplier and quotes only figures already decided", () => {
    const [selected] = rankSuppliers([ALPHA, BRAVO, CHARLIE], CONSTRAINTS);
    if (!selected) throw new Error("expected a selected candidate");

    const rationale = buildRationale(selected, "INR", 3, 3);

    expect(rationale).toContain("Supplier alpha");
    expect(rationale).toContain("₹1,800.00");
    expect(rationale).toContain("4-day delivery");
    expect(rationale).toContain("500 in stock");
  });
});
