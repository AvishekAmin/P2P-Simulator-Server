import type { RequisitionStatus, MessageRole } from "./enums";
import type { Supplier, SupplierProduct } from "./supplier";
import type { PurchaseOrder } from "./purchase-order";

export interface RequisitionMessage {
  id: string;
  organizationId: string;
  requisitionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Requirement {
  id: string;
  requisitionId: string;
  productName: string;
  category?: string | null;
  quantity: number;
  maxUnitPricePaise?: number | null;
  deliveryDeadlineDays?: number | null;
  deliveryLocation?: string | null;
  specifications?: Record<string, unknown> | null;
  currency: string;
  confidence?: number | null;
  missingFields: string[];
  rawExtraction: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierCandidate {
  id: string;
  organizationId: string;
  requisitionId: string;
  supplierId: string;
  supplierProductId?: string | null;
  eligible: boolean;
  ineligibleReason?: string | null;
  priceScore: number;
  deliveryScore: number;
  reliabilityScore: number;
  ratingScore: number;
  stockScore: number;
  totalScore: number;
  rank: number;
  unitPricePaise: number;
  deliveryDays: number;
  availableStock: number;
  createdAt: string;
  supplier?: Supplier;
  supplierProduct?: SupplierProduct;
}

export interface SourcingDecision {
  id: string;
  organizationId: string;
  requisitionId: string;
  selectedSupplierId: string;
  selectedSupplierProductId: string;
  totalScore: number;
  candidatesEvaluated: number;
  rationale?: string | null;
  createdAt: string;
  selectedSupplier?: Supplier;
  selectedSupplierProduct?: SupplierProduct;
}

export interface Requisition {
  id: string;
  organizationId: string;
  rawInput: string;
  status: RequisitionStatus;
  failureReason?: string | null;
  createdBy?: string | null;
  draftRequirements?: Record<string, unknown> | null;
  clarificationMessage?: string | null;
  missingFields?: string[];
  conflicts?: string[];
  turnCount?: number;
  createdAt: string;
  updatedAt?: string;
  requirement?: Requirement | null;
  messages?: RequisitionMessage[];
  supplierCandidates?: SupplierCandidate[];
  sourcingDecision?: SourcingDecision | null;
  purchaseOrder?: PurchaseOrder | null;
}
