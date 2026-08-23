import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";
import { sendError } from "../utils/response.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);

  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  if (err instanceof z.ZodError) {
    sendError(res, "VALIDATION_ERROR", "Invalid request", 400, z.flattenError(err));
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, "CONFLICT", "A record with these values already exists", 409, {
        target: err.meta?.target,
      });
      return;
    }
    if (err.code === "P2025") {
      sendError(res, "NOT_FOUND", "Resource not found", 404);
      return;
    }
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err instanceof Error
        ? err.message
        : "An unexpected error occurred";

  sendError(res, "INTERNAL_ERROR", message, 500);
}
