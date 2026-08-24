import type { ShipmentStatus } from "./enums";
import type { PurchaseOrder } from "./purchase-order";
import type { GoodsReceipt } from "./goods-receipt";

export interface Shipment {
  id: string;
  organizationId: string;
  purchaseOrderId: string;
  trackingNumber: string;
  carrier?: string | null;
  status: ShipmentStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  expectedDeliveryDate?: string | null;
  createdAt: string;
  updatedAt?: string;
  purchaseOrder?: PurchaseOrder;
  goodsReceipt?: GoodsReceipt | null;
}
