import { prisma } from "../config/prisma.js";

export interface AIProcessingLogInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  jobType: string;
  model: string;
  promptVersion: string;
  success: boolean;
  latencyMs: number;
  error?: string | null;
}

/**
 * Observability only — written outside any transaction and never allowed to
 * fail the job that produced it.
 */
export async function recordAIProcessing(input: AIProcessingLogInput): Promise<void> {
  try {
    await prisma.aIProcessingLog.create({
      data: {
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        jobType: input.jobType,
        model: input.model,
        promptVersion: input.promptVersion,
        success: input.success,
        latencyMs: input.latencyMs,
        error: input.error ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write AIProcessingLog:", error);
  }
}
