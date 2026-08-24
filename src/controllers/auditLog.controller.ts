import type { Request, Response } from "express";
import { listAuditLogs } from "../services/audit.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import { listAuditLogsQuerySchema } from "../zod/auditLog.schema.js";

function requireTenant(req: Request): { organizationId: string } {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  return { organizationId: req.auth.organizationId };
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const { organizationId } = requireTenant(req);
  const query = listAuditLogsQuerySchema.parse(req.query);

  sendSuccess(res, await listAuditLogs({ organizationId, ...query }));
}
