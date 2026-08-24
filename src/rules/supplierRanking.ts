import { SUPPLIER_SCORE_WEIGHTS } from "../config/constants.js";

/**
 * Deterministic supplier eligibility and ranking. Pure functions, no I/O, no
 * Prisma imports — this module is the financial decision-maker for sourcing, so
 * it must be exhaustively unit-testable and must never involve Gemini
 * (CLAUDE.md: "Supplier ranking is deterministic TypeScript.").
 */

export interface SupplierOffer {
  supplierId: string;
  supplierName: string;
  supplierProductId: string;
  unitPricePaise: number;
  currency: string;
  stockQuantity: number;
  deliveryDays: number;
  minOrderQuantity: number;
  isActive: boolean;
  /** 0-5 */
  rating: number;
  /** 0-1 */
  reliabilityScore: number;
}

export interface SourcingConstraints {
  quantity: number;
  currency: string;
  /** Null means the user set no price ceiling — the check passes for everyone. */
  maxUnitPricePaise: number | null;
  /** Null means the user set no deadline — the check passes for everyone. */
  deliveryDeadlineDays: number | null;
}

/** Mirrors the SupplierCandidate columns, plus the supplier name for display. */
export interface RankedCandidate {
  supplierId: string;
  supplierName: string;
  supplierProductId: string;
  eligible: boolean;
  ineligibleReason: string | null;
  priceScore: number;
  deliveryScore: number;
  reliabilityScore: number;
  ratingScore: number;
  stockScore: number;
  totalScore: number;
  rank: number;
  unitPricePaise: number;
  deliveryDays: number;
  availableStock: number;
}

/** Display only. Money is never computed from a formatted string. */
export function formatMoney(paise: number, currency: string): string {
  const amount = (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "INR" ? `₹${amount}` : `${currency} ${amount}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Returns the first failing eligibility reason, or null when the supplier
 * qualifies. The order is fixed so the same offer always produces the same
 * message — the reason is shown to buyers and stored on SupplierCandidate.
 */
export function checkEligibility(
  offer: SupplierOffer,
  constraints: SourcingConstraints,
): string | null {
  if (!offer.isActive) {
    return "Supplier is inactive";
  }

  // No FX table exists in the MVP, and approximate conversion must never touch
  // money — a differently denominated quote simply cannot be compared.
  if (offer.currency !== constraints.currency) {
    return `Quotes in ${offer.currency}, requirement is in ${constraints.currency}`;
  }

  if (offer.stockQuantity < constraints.quantity) {
    return `Stock ${offer.stockQuantity} is below the required ${constraints.quantity}`;
  }

  if (
    constraints.maxUnitPricePaise !== null &&
    offer.unitPricePaise > constraints.maxUnitPricePaise
  ) {
    return `Unit price ${formatMoney(offer.unitPricePaise, offer.currency)} exceeds the ${formatMoney(
      constraints.maxUnitPricePaise,
      constraints.currency,
    )} maximum`;
  }

  if (
    constraints.deliveryDeadlineDays !== null &&
    offer.deliveryDays > constraints.deliveryDeadlineDays
  ) {
    return `Delivery in ${offer.deliveryDays} days exceeds the ${constraints.deliveryDeadlineDays}-day deadline`;
  }

  if (offer.minOrderQuantity > constraints.quantity) {
    return `Minimum order of ${offer.minOrderQuantity} exceeds the requested ${constraints.quantity}`;
  }

  return null;
}

/** Cheapest/fastest becomes 100. A single value (min === max) scores 100, not 0. */
function lowerIsBetter(value: number, min: number, max: number): number {
  return max === min ? 100 : (100 * (max - value)) / (max - min);
}

/** Most stock becomes 100. */
function higherIsBetter(value: number, min: number, max: number): number {
  return max === min ? 100 : (100 * (value - min)) / (max - min);
}

/**
 * Scores and ranks every offer for a requirement.
 *
 * Price, delivery and stock are normalised min-max **across the eligible set
 * only** — an ineligible bargain must not deflate the price scores of the
 * suppliers actually in contention. Reliability and rating have natural
 * absolute scales (0-1 and 0-5) and are normalised against those instead.
 *
 * Ineligible offers are still returned, scored zero and ranked after every
 * eligible one, so the audit trail records why each supplier lost.
 */
export function rankSuppliers(
  offers: SupplierOffer[],
  constraints: SourcingConstraints,
): RankedCandidate[] {
  const evaluated = offers.map((offer) => ({
    offer,
    reason: checkEligibility(offer, constraints),
  }));
  const eligible = evaluated.filter((entry) => entry.reason === null);
  const ineligible = evaluated.filter((entry) => entry.reason !== null);

  const prices = eligible.map((entry) => entry.offer.unitPricePaise);
  const deliveries = eligible.map((entry) => entry.offer.deliveryDays);
  const stocks = eligible.map((entry) => entry.offer.stockQuantity);

  const scored: RankedCandidate[] = eligible.map(({ offer }) => {
    const priceScore = round2(
      lowerIsBetter(offer.unitPricePaise, Math.min(...prices), Math.max(...prices)),
    );
    const deliveryScore = round2(
      lowerIsBetter(offer.deliveryDays, Math.min(...deliveries), Math.max(...deliveries)),
    );
    const stockScore = round2(
      higherIsBetter(offer.stockQuantity, Math.min(...stocks), Math.max(...stocks)),
    );
    const reliabilityScore = round2(clamp(offer.reliabilityScore, 0, 1) * 100);
    const ratingScore = round2(clamp(offer.rating, 0, 5) * 20);

    // The total is built from the ROUNDED parts so a stored row always
    // reconciles: its five components add up to its total.
    const totalScore = round2(
      priceScore * SUPPLIER_SCORE_WEIGHTS.PRICE +
        deliveryScore * SUPPLIER_SCORE_WEIGHTS.DELIVERY +
        reliabilityScore * SUPPLIER_SCORE_WEIGHTS.RELIABILITY +
        ratingScore * SUPPLIER_SCORE_WEIGHTS.RATING +
        stockScore * SUPPLIER_SCORE_WEIGHTS.STOCK,
    );

    return {
      supplierId: offer.supplierId,
      supplierName: offer.supplierName,
      supplierProductId: offer.supplierProductId,
      eligible: true,
      ineligibleReason: null,
      priceScore,
      deliveryScore,
      reliabilityScore,
      ratingScore,
      stockScore,
      totalScore,
      rank: 0,
      unitPricePaise: offer.unitPricePaise,
      deliveryDays: offer.deliveryDays,
      availableStock: offer.stockQuantity,
    };
  });

  scored.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      a.unitPricePaise - b.unitPricePaise ||
      a.deliveryDays - b.deliveryDays ||
      a.supplierId.localeCompare(b.supplierId),
  );

  const rejected: RankedCandidate[] = ineligible
    .map(({ offer, reason }) => ({
      supplierId: offer.supplierId,
      supplierName: offer.supplierName,
      supplierProductId: offer.supplierProductId,
      eligible: false,
      ineligibleReason: reason,
      priceScore: 0,
      deliveryScore: 0,
      reliabilityScore: 0,
      ratingScore: 0,
      stockScore: 0,
      totalScore: 0,
      rank: 0,
      unitPricePaise: offer.unitPricePaise,
      deliveryDays: offer.deliveryDays,
      availableStock: offer.stockQuantity,
    }))
    .sort((a, b) => a.supplierId.localeCompare(b.supplierId));

  return [...scored, ...rejected].map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

/**
 * Deterministic fallback rationale, used verbatim when Gemini is unavailable or
 * returns something unusable. Never blocks — sourcing must complete without AI.
 */
export function buildRationale(
  selected: RankedCandidate,
  currency: string,
  evaluatedCount: number,
  eligibleCount: number,
): string {
  return (
    `${selected.supplierName} selected with a score of ${selected.totalScore.toFixed(1)}/100 ` +
    `from ${evaluatedCount} evaluated supplier(s), ${eligibleCount} of which met every requirement: ` +
    `${formatMoney(selected.unitPricePaise, currency)} per unit, ` +
    `${selected.deliveryDays}-day delivery, ${selected.availableStock} in stock.`
  );
}
