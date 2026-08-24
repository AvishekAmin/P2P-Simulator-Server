import { Router } from "express";
import { getShipmentById } from "../controllers/shipment.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const shipmentRouter: Router = Router();

shipmentRouter.get("/:id", asyncHandler(getShipmentById));
