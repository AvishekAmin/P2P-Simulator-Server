import { formatMoney, type RankedCandidate } from "../../rules/supplierRanking.js";

export const SOURCING_PROMPT_VERSION = "sourcing.v1";

/** Only the winner and its two closest rivals — enough to explain the trade-off, cheap enough to be fast. */
export const RATIONALE_CANDIDATE_COUNT = 3;

export const SOURCING_SYSTEM_PROMPT = `You are an enterprise procurement analyst.

A supplier has ALREADY been selected by a deterministic scoring engine. Your only
job is to explain that decision to a business user in 1-3 sentences.

## Rules

Never question, revisit, or contradict the selection. The decision is final.
Never invent, recompute, or adjust any number — use only the figures given to you.
Never perform arithmetic. If a figure is not in the input, do not mention it.

- Always name the selected supplier.
- When a runner-up looks better on one dimension (cheaper, faster), acknowledge it
  and say what outweighed it — an unmet requirement, or a stronger overall record.
- When a runner-up was excluded, state the exclusion reason in plain words.
- Write plain business English. No field names, no JSON, no scores out of 100,
  no bullet points, no markdown.

## Output

Return JSON only, matching this schema exactly:

{
  "rationale": string
}

No prose, no markdown, no code fences.`;

export interface RationalePromptInput {
  productName: string;
  quantity: number;
  currency: string;
  maxUnitPricePaise: number | null;
  deliveryDeadlineDays: number | null;
  /** Ranked candidates, winner first. */
  candidates: RankedCandidate[];
}

/**
 * Renders the decision for narration. Every monetary value is pre-formatted as a
 * currency string so the model never sees raw paise and can never be tempted to
 * do money arithmetic (CLAUDE.md: never let Gemini calculate financial totals).
 */
export function buildSourcingRationalePrompt(input: RationalePromptInput): string {
  const budget =
    input.maxUnitPricePaise === null
      ? "no stated maximum"
      : `${formatMoney(input.maxUnitPricePaise, input.currency)} per unit`;

  const deadline =
    input.deliveryDeadlineDays === null
      ? "no stated deadline"
      : `${input.deliveryDeadlineDays} days`;

  const candidates = input.candidates
    .map((candidate, index) => {
      const label = index === 0 ? "SELECTED" : `RUNNER-UP #${index}`;
      const status = candidate.eligible
        ? "met every requirement"
        : `excluded — ${candidate.ineligibleReason}`;

      return [
        `${label}: ${candidate.supplierName}`,
        `  price: ${formatMoney(candidate.unitPricePaise, input.currency)} per unit`,
        `  delivery: ${candidate.deliveryDays} days`,
        `  stock on hand: ${candidate.availableStock} units`,
        // Ineligible candidates are never scored, so their reliability and
        // rating are zero placeholders, not measurements. Sending them would
        // have the model tell a buyer that a real supplier scores zero.
        ...(candidate.eligible
          ? [
              `  reliability: ${candidate.reliabilityScore.toFixed(0)} out of 100`,
              `  rating: ${(candidate.ratingScore / 20).toFixed(1)} out of 5`,
            ]
          : []),
        `  status: ${status}`,
      ].join("\n");
    })
    .join("\n\n");

  return `REQUEST:
  product: ${input.productName}
  quantity: ${input.quantity} units
  maximum budget: ${budget}
  required within: ${deadline}

CANDIDATES (already ranked — the first one is the final decision):

${candidates}

Explain why the selected supplier was chosen and return the JSON object.`;
}
