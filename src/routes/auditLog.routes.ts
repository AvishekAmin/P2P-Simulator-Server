import { Router } from "express";
import { getAuditLogs } from "../controllers/auditLog.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const auditLogRouter: Router = Router();

// Read-only by design: audit rows are immutable through the API, so this
// router intentionally registers no POST/PATCH/PUT/DELETE handler. The only
// writer is recordAudit() in src/services/audit.service.ts, reachable only
// from services — never add a mutation route here.
auditLogRouter.get("/", asyncHandler(getAuditLogs));
