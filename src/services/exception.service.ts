import type { Prisma } from "../generated/prisma/client.js";
import type { ExceptionType, Severity } from "../generated/prisma/enums.js";

/** Prisma client or an interactive-transaction client — exceptions must be able to join a transaction. */
type PrismaLike = Pick<Prisma.TransactionClient, "exception">;

export interface ExceptionInput {
  organizationId: string;
  type: ExceptionType;
  severity: Severity;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Records a workflow exception idempotently.
 *
 * Upserts on the existing @@unique([organizationId, type, entityId]) so a
 * retried job cannot open the same exception twice. `status` is deliberately
 * left untouched on update: a re-drive must never reopen an exception a human
 * has already resolved.
 */
export async function recordException(
  db: PrismaLike,
  input: ExceptionInput,
): Promise<{ id: string }> {
  const payload = {
    severity: input.severity,
    title: input.title,
    description: input.description,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  };

  return db.exception.upsert({
    where: {
      organizationId_type_entityId: {
        organizationId: input.organizationId,
        type: input.type,
        entityId: input.entityId,
      },
    },
    create: {
      organizationId: input.organizationId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      ...payload,
    },
    update: payload,
    select: { id: true },
  });
}
