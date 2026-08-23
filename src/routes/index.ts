import { Router } from "express";
import { attachTenant } from "../middleware/auth.js";
import { apiRateLimit } from "../middleware/rateLimit.js";
import { healthRouter } from "./health.routes.js";

export const rootRouter: Router = Router();

rootRouter.use(healthRouter);

export const apiV1Router: Router = Router();
apiV1Router.use(apiRateLimit);
apiV1Router.use(attachTenant);

// No domain resources yet — this is the mount point for requisitions,
// suppliers, purchase-orders, invoices, matching, payments, exceptions, etc.
rootRouter.use("/api/v1", apiV1Router);
