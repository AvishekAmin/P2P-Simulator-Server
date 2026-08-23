import type { Request, Response } from "express";
import { sendError } from "../utils/response.js";

export function notFound(req: Request, res: Response): void {
  sendError(res, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
