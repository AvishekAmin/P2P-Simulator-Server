import type { GoodsReceipt } from "@/types/goods-receipt";
import { mockProducts } from "./suppliers";
import { mockPurchaseOrders } from "./purchase-orders";

export const mockGoodsReceipts: GoodsReceipt[] = [
  // --------------------------------------------------------------------------
  // Receipt 1: [SUCCESS] 100/100 received
  // --------------------------------------------------------------------------
  {
    id: "gr-demo-001",
    organizationId: "dev-org",
    purchaseOrderId: "po-demo-001",
    shipmentId: "shp-demo-001",
    status: "COMPLETED",
    receivedAt: "2026-08-23T15:00:00.000Z",
    receivedBy: "warehouse-inbound-agent@example.com",
    notes: "All 100 wireless keyboards received in pristine condition. Box barcodes verified.",
    createdAt: "2026-08-23T15:00:00.000Z",
    items: [
      {
        id: "gri-001",
        goodsReceiptId: "gr-demo-001",
        purchaseOrderItemId: "poi-001",
        productId: "prod-wireless-keyboard",
        orderedQuantity: 100,
        receivedQuantity: 100,
        damagedQuantity: 0,
        acceptedQuantity: 100,
        createdAt: "2026-08-23T15:00:00.000Z",
        product: mockProducts[0],
        purchaseOrderItem: mockPurchaseOrders[0].items?.[0],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Receipt 2: [QTY MISMATCH] 98 received, 2 damaged
  // --------------------------------------------------------------------------
  {
    id: "gr-demo-002",
    organizationId: "dev-org",
    purchaseOrderId: "po-demo-002",
    shipmentId: "shp-demo-002",
    status: "PARTIAL",
    receivedAt: "2026-08-23T16:30:00.000Z",
    receivedBy: "warehouse-inbound-agent@example.com",
    notes: "Short delivery detected: 98 mice received intact. 2 units found crushed during carton inspection.",
    createdAt: "2026-08-23T16:30:00.000Z",
    items: [
      {
        id: "gri-002",
        goodsReceiptId: "gr-demo-002",
        purchaseOrderItemId: "poi-002",
        productId: "prod-wireless-mouse",
        orderedQuantity: 100,
        receivedQuantity: 98,
        damagedQuantity: 2,
        acceptedQuantity: 98,
        createdAt: "2026-08-23T16:30:00.000Z",
        product: mockProducts[1],
        purchaseOrderItem: mockPurchaseOrders[1].items?.[0],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Receipt 3: [PRICE MISMATCH SCENARIO'S RECEIPT] 10/10 received
  // --------------------------------------------------------------------------
  {
    id: "gr-demo-003",
    organizationId: "dev-org",
    purchaseOrderId: "po-demo-003",
    shipmentId: "shp-demo-003",
    status: "COMPLETED",
    receivedAt: "2026-08-24T11:30:00.000Z",
    receivedBy: "warehouse-inbound-agent@example.com",
    notes: "All 10 monitor units unboxed and serial numbers scanned. Physical receipt verified.",
    createdAt: "2026-08-24T11:30:00.000Z",
    items: [
      {
        id: "gri-003",
        goodsReceiptId: "gr-demo-003",
        purchaseOrderItemId: "poi-003",
        productId: "prod-monitor-24",
        orderedQuantity: 10,
        receivedQuantity: 10,
        damagedQuantity: 0,
        acceptedQuantity: 10,
        createdAt: "2026-08-24T11:30:00.000Z",
        product: mockProducts[5],
        purchaseOrderItem: mockPurchaseOrders[2].items?.[0],
      },
    ],
  },
];
