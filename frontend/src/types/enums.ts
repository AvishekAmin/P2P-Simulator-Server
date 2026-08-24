// ============================================================================
// PR2 Status & Classification Enums (mirrored from backend Prisma Schema)
// ============================================================================

export type RequisitionStatus =
  | "CREATED"
  | "PROCESSING"
  | "REQUIREMENTS_EXTRACTED"
  | "SUPPLIER_SELECTED"
  | "PO_CREATED"
  | "NEEDS_CLARIFICATION"
  | "FAILED";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SHIPPED"
  | "RECEIVED"
  | "COMPLETED"
  | "REJECTED";

export type ShipmentStatus =
  | "CREATED"
  | "IN_TRANSIT"
  | "DELIVERED";

export type GoodsReceiptStatus =
  | "PENDING"
  | "PARTIAL"
  | "COMPLETED";

export type InvoiceStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "EXTRACTED"
  | "MATCHING"
  | "APPROVED"
  | "EXCEPTION"
  | "PAID"
  | "FAILED";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED";

export type MatchStatus =
  | "MATCHED"
  | "MISMATCHED";

export type MatchCheckType =
  | "SUPPLIER"
  | "PO_NUMBER"
  | "PRODUCT"
  | "ORDERED_QUANTITY"
  | "RECEIVED_QUANTITY"
  | "INVOICED_QUANTITY"
  | "UNIT_PRICE"
  | "SUBTOTAL"
  | "TAX"
  | "TOTAL"
  | "CURRENCY"
  | "DUPLICATE_INVOICE";

export type Severity =
  | "INFO"
  | "WARNING"
  | "CRITICAL";

export type ExceptionStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "REJECTED";

export type ExceptionType =
  | "REQUIREMENT_INCOMPLETE"
  | "NO_SUPPLIER_FOUND"
  | "PO_APPROVAL_REQUIRED"
  | "INVOICE_EXTRACTION_FAILED"
  | "QUANTITY_MISMATCH"
  | "PRICE_MISMATCH"
  | "SUPPLIER_MISMATCH"
  | "DUPLICATE_INVOICE"
  | "TAX_MISMATCH"
  | "TOTAL_MISMATCH"
  | "PAYMENT_FAILURE"
  | "SYSTEM_FAILURE";

export type ActorType =
  | "SYSTEM"
  | "AI"
  | "USER";

export type MessageRole =
  | "USER"
  | "ASSISTANT";

export type AuditAction =
  | "REQUISITION_CREATED"
  | "REQUISITION_CLARIFICATION_REQUESTED"
  | "REQUIREMENTS_EXTRACTED"
  | "SUPPLIERS_DISCOVERED"
  | "SUPPLIER_SELECTED"
  | "PO_CREATED"
  | "PO_APPROVED"
  | "PO_REJECTED"
  | "SHIPMENT_CREATED"
  | "GOODS_RECEIVED"
  | "INVOICE_UPLOADED"
  | "INVOICE_EXTRACTED"
  | "MATCH_STARTED"
  | "MATCH_COMPLETED"
  | "EXCEPTION_CREATED"
  | "EXCEPTION_RESOLVED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_COMPLETED"
  | "WORKFLOW_FAILED";
