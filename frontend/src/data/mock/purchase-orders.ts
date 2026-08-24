import type { PurchaseOrder } from "@/types/purchase-order";
import { mockSuppliers, mockProducts, mockSupplierProducts } from "./suppliers";

export const mockPurchaseOrders: PurchaseOrder[] = [
  // --------------------------------------------------------------------------
  // PO 1: [SUCCESS Scenario]
  // --------------------------------------------------------------------------
  {
    id: "po-demo-001",
    organizationId: "dev-org",
    poNumber: "PO-2026-001",
    requisitionId: "req-demo-001",
    supplierId: "sup-techsource",
    status: "APPROVED",
    subtotalPaise: 18200000, // ₹1,82,000 (100 * ₹1,820)
    taxPaise: 3276000,       // ₹32,760 (18% GST)
    totalPaise: 21476000,    // ₹2,14,760
    taxRateBps: 1800,        // 18.00%
    currency: "INR",
    expectedDeliveryDate: "2026-08-25T18:00:00.000Z",
    approvedAt: "2026-08-20T10:00:00.000Z",
    approvedBy: "finance-admin@example.com",
    createdAt: "2026-08-20T09:35:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    supplier: mockSuppliers[0],
    items: [
      {
        id: "poi-001",
        purchaseOrderId: "po-demo-001",
        productId: "prod-wireless-keyboard",
        supplierProductId: "sp-keyboard-techsource",
        description: "Wireless Keyboard (Black, USB Dongle, 2.4GHz)",
        quantity: 100,
        unitPricePaise: 182000,
        lineTotalPaise: 18200000,
        createdAt: "2026-08-20T09:35:00.000Z",
        product: mockProducts[0],
        supplierProduct: mockSupplierProducts[0],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PO 2: [QTY MISMATCH Scenario]
  // --------------------------------------------------------------------------
  {
    id: "po-demo-002",
    organizationId: "dev-org",
    poNumber: "PO-2026-002",
    requisitionId: "req-demo-002",
    supplierId: "sup-techsource",
    status: "SHIPPED",
    subtotalPaise: 4500000, // ₹45,000 (100 * ₹450)
    taxPaise: 810000,       // ₹8,100 (18% GST)
    totalPaise: 5310000,    // ₹53,100
    taxRateBps: 1800,
    currency: "INR",
    expectedDeliveryDate: "2026-08-25T18:00:00.000Z",
    approvedAt: "2026-08-21T10:30:00.000Z",
    approvedBy: "auto-approved",
    createdAt: "2026-08-21T10:05:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
    supplier: mockSuppliers[0],
    items: [
      {
        id: "poi-002",
        purchaseOrderId: "po-demo-002",
        productId: "prod-wireless-mouse",
        supplierProductId: "sp-mouse-techsource",
        description: "Wireless Optical Mouse (1600 DPI, Ergonomic)",
        quantity: 100,
        unitPricePaise: 45000,
        lineTotalPaise: 4500000,
        createdAt: "2026-08-21T10:05:00.000Z",
        product: mockProducts[1],
        supplierProduct: mockSupplierProducts[3],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PO 3: [PRICE MISMATCH Scenario]
  // --------------------------------------------------------------------------
  {
    id: "po-demo-003",
    organizationId: "dev-org",
    poNumber: "PO-2026-003",
    requisitionId: "req-demo-003",
    supplierId: "sup-techsource",
    status: "RECEIVED",
    subtotalPaise: 8400000, // ₹84,000 (10 * ₹8,400)
    taxPaise: 1512000,      // ₹15,120
    totalPaise: 9912000,    // ₹99,120
    taxRateBps: 1800,
    currency: "INR",
    expectedDeliveryDate: "2026-08-28T18:00:00.000Z",
    approvedAt: "2026-08-22T11:30:00.000Z",
    approvedBy: "auto-approved",
    createdAt: "2026-08-22T11:05:00.000Z",
    updatedAt: "2026-08-23T09:00:00.000Z",
    supplier: mockSuppliers[0],
    items: [
      {
        id: "poi-003",
        purchaseOrderId: "po-demo-003",
        productId: "prod-monitor-24",
        supplierProductId: "sp-monitor-techsource",
        description: '24" Full HD IPS Monitor (75Hz, HDMI/VGA)',
        quantity: 10,
        unitPricePaise: 840000,
        lineTotalPaise: 8400000,
        createdAt: "2026-08-22T11:05:00.000Z",
        product: mockProducts[5],
        supplierProduct: mockSupplierProducts[5],
      },
    ],
  },
];
