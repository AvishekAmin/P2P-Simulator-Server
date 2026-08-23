import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

// TODO(auth): replace with Clerk once we add real authentication.
// Until then the tenant comes from an x-organization-id header, falling back to
// the dev organization. This is deliberately trusting — there is no auth yet.

export function attachTenant(req: Request, _res: Response, next: NextFunction): void {
  const headerOrganizationId = req.header("x-organization-id")?.trim();

  req.auth = {
    userId: process.env.DEV_USER_ID,
    organizationId:
      headerOrganizationId && headerOrganizationId.length > 0
        ? headerOrganizationId
        : process.env.DEV_ORGANIZATION_ID,
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

/**
 * Rejects requests naming an organization that does not exist, so every
 * downstream tenant-scoped query is guaranteed a real tenant.
 */
export async function requireOrganization(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const organizationId = req.auth?.organizationId;

  if (!organizationId) {
    next(AppError.unauthorized());
    return;
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      next(AppError.notFound(`Organization "${organizationId}" not found`));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
