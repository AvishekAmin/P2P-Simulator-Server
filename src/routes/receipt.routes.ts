import { Router } from "express";
import { postSimulatedReceipt } from "../controllers/receipt.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const receiptRouter: Router = Router();

// Simulated IoT goods receipt — there is deliberately no generic status endpoint.
receiptRouter.post("/simulate", asyncHandler(postSimulatedReceipt));
