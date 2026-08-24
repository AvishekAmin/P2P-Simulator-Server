import type { ExceptionStatus, ExceptionType, Severity } from "./enums";

export interface Exception {
  id: string;
  organizationId: string;
  type: ExceptionType;
  status: ExceptionStatus;
  severity: Severity;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  resolution?: string | null;
  resolutionReason?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}
