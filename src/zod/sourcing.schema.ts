import { z } from "zod";

// AI output. Gemini only narrates a decision deterministic code has already
// made — nothing downstream reads this text, so a bad response degrades the
// explanation and never the outcome.

export const sourcingRationaleSchema = z.object({
  rationale: z.string().trim().min(1).max(600),
});

export type SourcingRationale = z.infer<typeof sourcingRationaleSchema>;
