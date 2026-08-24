import type { Request, Response } from "express";
import {
  approvePurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  rejectPurchaseOrder,
} from "../services/purchaseOrder.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import {
  listPurchaseOrdersQuerySchema,
  purchaseOrderIdParamSchema,
  rejectPurchaseOrderSchema,
} from "../zod/purchaseOrder.schema.js";

function requireTenant(req: Request): { organizationId: string; userId: string } {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  return { organizationId: req.auth.organizationId, userId: req.auth.userId };
}

export async function getPurchaseOrderById(req: Request, res: Response): Promise<void> {
  const { organizationId } = requireTenant(req);
  const { id } = purchaseOrderIdParamSchema.parse(req.params);

  sendSuccess(res, await getPurchaseOrder({ organizationId, purchaseOrderId: id }));
}

export async function getPurchaseOrders(req: Request, res: Response): Promise<void> {
  const { organizationId } = requireTenant(req);
  const query = listPurchaseOrdersQuerySchema.parse(req.query);

  sendSuccess(res, await listPurchaseOrders({ organizationId, ...query }));
}

export async function postPurchaseOrderApproval(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requireTenant(req);
  const { id } = purchaseOrderIdParamSchema.parse(req.params);

  sendSuccess(res, await approvePurchaseOrder({ organizationId, purchaseOrderId: id, userId }));
}

export async function postPurchaseOrderRejection(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requireTenant(req);
  const { id } = purchaseOrderIdParamSchema.parse(req.params);
  const { reason } = rejectPurchaseOrderSchema.parse(req.body);

  sendSuccess(
    res,
    await rejectPurchaseOrder({ organizationId, purchaseOrderId: id, userId, reason }),
  );
}
