import type {
  DraftRequirements,
  ExtractedRequirements,
  RequisitionIntent,
} from "../zod/requisition.schema.js";

/**
 * Deterministic requirement rules. Pure functions, no I/O — Gemini interprets
 * the user's message, but everything here decides whether procurement can
 * actually start (CLAUDE.md: "AI interprets. Deterministic code decides.").
 */

export const REQUIRED_FIELDS = [
  "productName",
  "quantity",
  "maxUnitPricePaise",
  "currency",
  "deliveryDays",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

/** Natural-language phrasing per field. Users must never see raw field names. */
const FIELD_PROMPTS: Record<RequiredField, string> = {
  productName: "what you'd like to buy",
  quantity: "how many units you need",
  maxUnitPricePaise: "the maximum you'd like to spend per unit",
  currency: "which currency that budget is in",
  deliveryDays: "when you need it delivered by",
};

const IRRELEVANT_MESSAGE =
  "I can help with procurement requests. Tell me what you need to purchase, the quantity, your maximum budget per unit, and when you need it.";

export const COMPLETE_MESSAGE =
  "Got it. I have all the requirements and started the procurement process.";

/**
 * Merges a newly extracted turn onto the previously confirmed draft.
 *
 * A non-null incoming value always wins — that is how corrections work ("make
 * it 200 instead"). A null incoming value leaves the previous value untouched,
 * so we never re-ask for information the user already gave us.
 */
export function mergeDraft(
  previous: DraftRequirements,
  incoming: ExtractedRequirements,
): DraftRequirements {
  return {
    productName: incoming.productName ?? previous.productName,
    quantity: incoming.quantity ?? previous.quantity,
    maxUnitPricePaise: incoming.maxUnitPricePaise ?? previous.maxUnitPricePaise,
    currency: incoming.currency ?? previous.currency,
    deliveryDays: incoming.deliveryDays ?? previous.deliveryDays,
    location: incoming.location ?? previous.location,
    specifications: { ...previous.specifications, ...incoming.specifications },
  };
}

/**
 * Conflicts are ambiguities we cannot resolve on the user's behalf, not simple
 * corrections. A value changing across turns is an intentional correction and
 * is accepted silently; only contradictions the model reports from within a
 * single message block procurement.
 */
export function normalizeConflicts(reported: string[]): string[] {
  return [...new Set(reported.map((entry) => entry.trim()).filter((entry) => entry.length > 0))];
}

export function findMissingFields(draft: DraftRequirements): RequiredField[] {
  return REQUIRED_FIELDS.filter((field) => draft[field] === null || draft[field] === undefined);
}

export function isComplete(draft: DraftRequirements, conflicts: string[]): boolean {
  return findMissingFields(draft).length === 0 && conflicts.length === 0;
}

/** Joins phrases as "a", "a and b", "a, b and c". */
function joinNaturally(parts: string[]): string {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }
  const head = parts.slice(0, -1).join(", ");
  return `${head} and ${parts[parts.length - 1]}`;
}

/**
 * Deterministic clarification copy. Used when Gemini's own `userMessage` is
 * unusable (malformed response, failed call), so the conversation still moves
 * forward instead of dead-ending during a demo.
 */
export function buildClarificationMessage(
  intent: RequisitionIntent,
  missing: RequiredField[],
  conflicts: string[],
): string {
  if (conflicts.length > 0) {
    return `${joinNaturally(conflicts)} Which should I use?`;
  }

  if (intent === "IRRELEVANT" || missing.length === REQUIRED_FIELDS.length) {
    return IRRELEVANT_MESSAGE;
  }

  if (missing.length === 0) {
    return COMPLETE_MESSAGE;
  }

  return `Almost there — could you also tell me ${joinNaturally(
    missing.map((field) => FIELD_PROMPTS[field]),
  )}?`;
}

export interface RequirementCreateInput {
  productName: string;
  quantity: number;
  maxUnitPricePaise: number;
  currency: string;
  deliveryDeadlineDays: number;
  deliveryLocation: string | null;
  specifications: Record<string, unknown>;
}

/**
 * Narrows a complete draft to the non-nullable Requirement shape. Throws rather
 * than coercing — callers must gate on isComplete() first, so reaching here
 * with a hole is a programming error, not a user error.
 */
export function toRequirementInput(draft: DraftRequirements): RequirementCreateInput {
  const missing = findMissingFields(draft);
  if (missing.length > 0) {
    throw new Error(`Cannot build a Requirement from an incomplete draft: ${missing.join(", ")}`);
  }

  return {
    productName: draft.productName as string,
    quantity: draft.quantity as number,
    maxUnitPricePaise: draft.maxUnitPricePaise as number,
    currency: draft.currency as string,
    deliveryDeadlineDays: draft.deliveryDays as number,
    deliveryLocation: draft.location,
    specifications: draft.specifications,
  };
}
