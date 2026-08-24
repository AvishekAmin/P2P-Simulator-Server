import type { MatchStatus, MatchCheckType, Severity } from "./enums";

export interface MatchCheck {
  id: string;
  threeWayMatchId: string;
  checkType: MatchCheckType;
  expected: string;
  actual: string;
  passed: boolean;
  variance?: number | null;
  severity: Severity;
  createdAt: string;
}

export interface ThreeWayMatch {
  id: string;
  organizationId: string;
  invoiceId: string;
  purchaseOrderId: string;
  goodsReceiptId?: string | null;
  status: MatchStatus;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  matchedAt: string;
  createdAt: string;
  checks?: MatchCheck[];
}
