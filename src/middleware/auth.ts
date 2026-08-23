import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

// TODO(auth): replace with Clerk once we add real authentication.

export function attachTenant(req: Request, _res: Response, next: NextFunction): void {
  req.auth = {
    userId: process.env.DEV_USER_ID,
    organizationId: process.env.DEV_ORGANIZATION_ID,
  };
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(AppError.unauthorized());
    return;
  }
  next();
}
