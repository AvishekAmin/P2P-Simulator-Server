import type { GoodsReceiptStatus } from "./enums";
import type { Product } from "./supplier";
import type { PurchaseOrderItem } from "./purchase-order";
import type { Shipment } from "./shipment";

export interface ReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId: string;
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  acceptedQuantity: number;
  createdAt: string;
  product?: Product;
  purchaseOrderItem?: PurchaseOrderItem;
}

export interface GoodsReceipt {
  id: string;
  organizationId: string;
  purchaseOrderId: string;
  shipmentId: string;
  status: GoodsReceiptStatus;
  receivedAt: string;
  receivedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  items?: ReceiptItem[];
  shipment?: Shipment;
}
