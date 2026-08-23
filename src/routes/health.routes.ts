import { Router } from "express";
import { getHealth, getReadiness } from "../controllers/health.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const healthRouter: Router = Router();

healthRouter.get("/health", getHealth);
healthRouter.get("/ready", asyncHandler(getReadiness));
