import { z } from "zod";
import { ExceptionStatus, ExceptionType } from "../generated/prisma/enums.js";

export const exceptionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listExceptionsQuerySchema = z.object({
  status: z.enum(ExceptionStatus).optional(),
  type: z.enum(ExceptionType).optional(),
  entityId: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().min(1).optional(),
});
export type ListExceptionsQuery = z.infer<typeof listExceptionsQuerySchema>;

/**
 * A resolution is a financial judgement, so the reason is mandatory and has to
 * say something — CLAUDE.md §12: "Every resolution needs a reason and AuditLog."
 */
export const resolveExceptionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(10, "Explain the decision in at least 10 characters").max(1000),
});
export type ResolveExceptionInput = z.infer<typeof resolveExceptionSchema>;
