import type { Request, Response } from "express";
import { enqueuePayment } from "../queues/payment.queue.js";
import {
  getExceptionById,
  listExceptions,
  resolveExceptionById,
} from "../services/exception.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import {
  exceptionIdParamSchema,
  listExceptionsQuerySchema,
  resolveExceptionSchema,
} from "../zod/exception.schema.js";

function requireTenant(req: Request): { organizationId: string; userId: string } {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  return { organizationId: req.auth.organizationId, userId: req.auth.userId };
}

export async function getExceptions(req: Request, res: Response): Promise<void> {
  const { organizationId } = requireTenant(req);
  const query = listExceptionsQuerySchema.parse(req.query);

  sendSuccess(res, await listExceptions({ organizationId, ...query }));
}

export async function getException(req: Request, res: Response): Promise<void> {
  const { organizationId } = requireTenant(req);
  const { id } = exceptionIdParamSchema.parse(req.params);

  sendSuccess(res, { exception: await getExceptionById({ organizationId, exceptionId: id }) });
}

/**
 * Records a human decision on an exception, and — when that was the last thing
 * standing between an invoice and its payment — queues the payment.
 *
 * The queueing happens after the transaction commits, never inside it. The
 * payment worker re-checks the whole gate anyway, so a lost enqueue delays
 * settlement rather than corrupting it.
 */
export async function postExceptionResolution(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requireTenant(req);
  const { id } = exceptionIdParamSchema.parse(req.params);
  const { decision, reason } = resolveExceptionSchema.parse(req.body);

  const result = await resolveExceptionById({
    organizationId,
    exceptionId: id,
    decision,
    reason,
    actorId: userId,
  });

  if (result.releasedForPayment && result.invoiceId) {
    await enqueuePayment({ invoiceId: result.invoiceId, organizationId });
  }

  sendSuccess(res, {
    exception: result.exception,
    releasedForPayment: result.releasedForPayment,
  });
}
