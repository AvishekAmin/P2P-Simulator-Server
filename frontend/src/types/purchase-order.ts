import type { PurchaseOrderStatus } from "./enums";
import type { Supplier, Product, SupplierProduct } from "./supplier";
import type { Shipment } from "./shipment";
import type { Invoice } from "./invoice";

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  supplierProductId?: string | null;
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  createdAt: string;
  product?: Product;
  supplierProduct?: SupplierProduct;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  poNumber: string;
  requisitionId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  taxRateBps: number; // e.g. 1800 = 18%
  currency: string;
  expectedDeliveryDate?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
  shipment?: Shipment | null;
  invoices?: Invoice[];
}
