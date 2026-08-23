import { z } from "zod";
import { RequisitionStatus } from "../generated/prisma/enums.js";

// ---------------------------------------------------------------------------
// API input
// ---------------------------------------------------------------------------

const chatInput = z.string().trim().min(1, "Message cannot be empty").max(2000);

export const createRequisitionSchema = z.object({
  input: chatInput,
});
export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;

export const requisitionMessageSchema = z.object({
  input: chatInput,
});
export type RequisitionMessageInput = z.infer<typeof requisitionMessageSchema>;

export const requisitionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listRequisitionsQuerySchema = z.object({
  status: z.enum(RequisitionStatus).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().min(1).optional(),
});
export type ListRequisitionsQuery = z.infer<typeof listRequisitionsQuerySchema>;

// ---------------------------------------------------------------------------
// AI output
// ---------------------------------------------------------------------------

/**
 * The extracted requirement fields. Every field is nullable — Gemini must use
 * null for anything the user has not explicitly stated rather than guessing.
 */
export const extractedRequirementsSchema = z.object({
  productName: z.string().trim().min(1).nullable(),
  quantity: z.number().int().positive().nullable(),
  maxUnitPricePaise: z.number().int().positive().nullable(),
  currency: z.string().trim().length(3).toUpperCase().nullable(),
  deliveryDays: z.number().int().positive().nullable(),
  location: z.string().trim().min(1).nullable(),
  specifications: z.record(z.string(), z.unknown()).default({}),
});
export type ExtractedRequirements = z.infer<typeof extractedRequirementsSchema>;

export const REQUISITION_INTENTS = ["PROCUREMENT", "IRRELEVANT", "UNCLEAR"] as const;
export type RequisitionIntent = (typeof REQUISITION_INTENTS)[number];

/**
 * Contract for the requisition extraction prompt. `missingRequiredFields` and
 * `conflicts` are advisory only — src/rules/requirementRules.ts recomputes both
 * deterministically. AI interprets, deterministic code decides (CLAUDE.md).
 */
export const extractionResultSchema = z.object({
  intent: z.enum(REQUISITION_INTENTS),
  extracted: extractedRequirementsSchema,
  missingRequiredFields: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  userMessage: z.string().trim().min(1),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

/**
 * Shape of Requisition.draftRequirements when read back out of the Json column.
 * Never `as`-cast that column — it is untrusted until parsed.
 */
export const draftRequirementsSchema = extractedRequirementsSchema;
export type DraftRequirements = ExtractedRequirements;

export const EMPTY_DRAFT: DraftRequirements = {
  productName: null,
  quantity: null,
  maxUnitPricePaise: null,
  currency: null,
  deliveryDays: null,
  location: null,
  specifications: {},
};

/** Parses a persisted draft, falling back to an empty draft if it is absent or malformed. */
export function parseDraft(value: unknown): DraftRequirements {
  const parsed = draftRequirementsSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...EMPTY_DRAFT };
}
