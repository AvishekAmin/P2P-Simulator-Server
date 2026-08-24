import type { Prisma } from "../generated/prisma/client.js";
import type { ActorType, AuditAction } from "../generated/prisma/enums.js";

/** Prisma client or an interactive-transaction client — audits must be able to join a transaction. */
type PrismaLike = Pick<Prisma.TransactionClient, "auditLog">;

export interface AuditInput {
  organizationId: string;
  actorType: ActorType;
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Writes an audit row. Pass the transaction client when the audit must commit
 * atomically with the state change it describes (CLAUDE.md: important state
 * transitions must be audited).
 */
export async function recordAudit(db: PrismaLike, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });
}
