import type { InvoiceStatus } from "./enums";
import type { Supplier, Product } from "./supplier";
import type { PurchaseOrder } from "./purchase-order";
import type { ThreeWayMatch } from "./matching";
import type { Payment } from "./payment";

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  productId?: string | null;
  createdAt: string;
  product?: Product;
}

export interface Invoice {
  id: string;
  organizationId: string;
  purchaseOrderId: string;
  supplierId?: string | null;
  status: InvoiceStatus;
  fileUrl: string;
  filePublicId: string;
  fileMimeType: string;
  fileSizeBytes: number;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  supplierNameRaw?: string | null;
  poNumberRaw?: string | null;
  subtotalPaise?: number | null;
  taxPaise?: number | null;
  totalPaise?: number | null;
  currency?: string | null;
  extractedAt?: string | null;
  rawExtraction?: Record<string, unknown> | null;
  extractionAttempts: number;
  failureReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  purchaseOrder?: PurchaseOrder;
  supplier?: Supplier | null;
  items?: InvoiceItem[];
  threeWayMatch?: ThreeWayMatch | null;
  payment?: Payment | null;
}
