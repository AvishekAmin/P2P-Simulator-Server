import { z } from "zod";
import { ActorType, AuditAction } from "../generated/prisma/enums.js";
import { AUDIT_ENTITY_TYPES } from "../services/audit.service.js";

export const listAuditLogsQuerySchema = z.object({
  action: z.enum(AuditAction).optional(),
  actorType: z.enum(ActorType).optional(),
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  entityId: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().min(1).optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
