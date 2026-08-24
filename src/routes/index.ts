import { Router } from "express";
import { attachTenant, requireOrganization } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { healthRouter } from "./health.routes.js";
import { purchaseOrderRouter } from "./purchaseOrder.routes.js";
import { requisitionRouter } from "./requisition.routes.js";

export const rootRouter: Router = Router();

rootRouter.use(healthRouter);

export const apiV1Router: Router = Router();
apiV1Router.use(apiRateLimit);
apiV1Router.use(attachTenant);
apiV1Router.use(asyncHandler(requireOrganization));

apiV1Router.use("/requisitions", requisitionRouter);
apiV1Router.use("/purchase-orders", purchaseOrderRouter);

// Mount point for the remaining resources: suppliers, invoices, matching,
// payments, exceptions.
rootRouter.use("/api/v1", apiV1Router);
