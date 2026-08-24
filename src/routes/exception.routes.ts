import { Router } from "express";
import {
  getException,
  getExceptions,
  postExceptionResolution,
} from "../controllers/exception.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const exceptionRouter: Router = Router();

exceptionRouter.get("/", asyncHandler(getExceptions));
exceptionRouter.get("/:id", asyncHandler(getException));
exceptionRouter.post("/:id/resolve", asyncHandler(postExceptionResolution));
