import { Router } from "express";
import {
  getRequisitionById,
  getRequisitions,
  postRequisition,
  postRequisitionMessage,
} from "../controllers/requisition.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requisitionRouter: Router = Router();

requisitionRouter.post("/", asyncHandler(postRequisition));
requisitionRouter.get("/", asyncHandler(getRequisitions));
requisitionRouter.get("/:id", asyncHandler(getRequisitionById));
requisitionRouter.post("/:id/messages", asyncHandler(postRequisitionMessage));
