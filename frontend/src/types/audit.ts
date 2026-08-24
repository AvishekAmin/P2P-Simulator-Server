import type { ActorType, AuditAction } from "./enums";

export interface AuditLog {
  id: string;
  organizationId: string;
  actorType: ActorType;
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AIProcessingLog {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  jobType: string;
  model: string;
  promptVersion: string;
  success: boolean;
  latencyMs: number;
  error?: string | null;
  createdAt: string;
}
