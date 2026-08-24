import type { Invoice } from "@/types/invoice";
import { mockSuppliers, mockProducts } from "./suppliers";
import { mockPurchaseOrders } from "./purchase-orders";

export const mockInvoices: Invoice[] = [
  // --------------------------------------------------------------------------
  // Invoice 1: [SUCCESS] Matched and Paid
  // --------------------------------------------------------------------------
  {
    id: "inv-demo-001",
    organizationId: "dev-org",
    purchaseOrderId: "po-demo-001",
    supplierId: "sup-techsource",
    status: "PAID",
    fileUrl: "https://res.cloudinary.com/demo/image/upload/v1/invoices/inv-001.pdf",
    filePublicId: "invoices/inv-001",
    fileMimeType: "application/pdf",
    fileSizeBytes: 245000,
    invoiceNumber: "INV-TS-2026-8801",
    invoiceDate: "2026-08-23T10:00:00.000Z",
    supplierNameRaw: "TechSource Distributors Pvt Ltd",
    poNumberRaw: "PO-2026-001",
    subtotalPaise: 18200000, // ₹1,82,000
    taxPaise: 3276000,       // ₹32,760
    totalPaise: 21476000,    // ₹2,14,760
    currency: "INR",
    extractedAt: "2026-08-23T11:00:00.000Z",
    extractionAttempts: 1,
    createdAt: "2026-08-23T10:45:00.000Z",
    updatedAt: "2026-08-23T16:00:00.000Z",
    purchaseOrder: mockPurchaseOrders[0],
    supplier: mockSuppliers[0],
    items: [
      {
        id: "invi-001",
        invoiceId: "inv-demo-001",
        lineNumber: 1,
        description: "Wireless Keyboard",
        quantity: 100,
        unitPricePaise: 182000,
        lineTotalPaise: 18200000,
        productId: "prod-wireless-keyboard",
        createdAt: "2026-08-23T11:00:00.000Z",
        product: mockProducts[0],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Invoice 2: [QTY MISMATCH] Invoiced 100 vs 98 received
  // --------------------------------------------------------------------------
  {
    id: "inv-demo-002",
    organizationId: "dev-org",
    purchaseOrderId: "po-demo-002",
    supplierId: "sup-techsource",
    status: "EXCEPTION",
    fileUrl: "https://res.cloudinary.com/demo/image/upload/v1/invoices/inv-002.pdf",
    filePublicId: "invoices/inv-002",
    fileMimeType: "application/pdf",
    fileSizeBytes: 185000,
    invoiceNumber: "INV-TS-2026-8802",
    invoiceDate: "2026-08-23T12:00:00.000Z",
    supplierNameRaw: "TechSource Distributors Pvt Ltd",
    poNumberRaw: "PO-2026-002",
    subtotalPaise: 4500000, // ₹45,000 (claims 100 * ₹450)
    taxPaise: 810000,       // ₹8,100
    totalPaise: 5310000,    // ₹53,100
    currency: "INR",
    extractedAt: "2026-08-23T13:00:00.000Z",
    extractionAttempts: 1,
    failureReason: "3-Way Match discrepancy: Invoiced quantity (100) exceeds physically accepted receipt quantity (98).",
    createdAt: "2026-08-23T12:30:00.000Z",
    updatedAt: "2026-08-23T17:00:00.000Z",
    purchaseOrder: mockPurchaseOrders[1],
    supplier: mockSuppliers[0],
    items: [
      {
        id: "invi-002",
        invoiceId: "inv-demo-002",
        lineNumber: 1,
        description: "Wireless Optical Mouse",
        quantity: 100,
        unitPricePaise: 45000,
        lineTotalPaise: 4500000,
        productId: "prod-wireless-mouse",
        createdAt: "2026-08-23T13:00:00.000Z",
        product: mockProducts[1],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Invoice 3: [PRICE MISMATCH] Unit price inflated to ₹9,700 vs ₹8,400 PO
  // --------------------------------------------------------------------------
  {
    id: "inv-demo-003",
    organizationId: "dev-org",
    purchaseOrderId: "po-demo-003",
    supplierId: "sup-techsource",
    status: "EXCEPTION",
    fileUrl: "https://res.cloudinary.com/demo/image/upload/v1/invoices/inv-003.pdf",
    filePublicId: "invoices/inv-003",
    fileMimeType: "application/pdf",
    fileSizeBytes: 210000,
    invoiceNumber: "INV-TS-2026-8803",
    invoiceDate: "2026-08-24T09:00:00.000Z",
    supplierNameRaw: "TechSource Distributors Pvt Ltd",
    poNumberRaw: "PO-2026-003",
    subtotalPaise: 9700000, // ₹97,000 (claims 10 * ₹9,700 instead of ₹8,400)
    taxPaise: 1746000,      // ₹17,460 (18% GST on ₹97,000)
    totalPaise: 11446000,   // ₹1,14,460 (PO total was ₹99,120)
    currency: "INR",
    extractedAt: "2026-08-24T10:00:00.000Z",
    extractionAttempts: 1,
    failureReason: "3-Way Match discrepancy: Invoiced unit price (₹9,700.00) exceeds PO unit price (₹8,400.00) by ₹1,300.00/unit (+15.48% variance).",
    createdAt: "2026-08-24T09:30:00.000Z",
    updatedAt: "2026-08-24T12:00:00.000Z",
    purchaseOrder: mockPurchaseOrders[2],
    supplier: mockSuppliers[0],
    items: [
      {
        id: "invi-003",
        invoiceId: "inv-demo-003",
        lineNumber: 1,
        description: '24" Full HD Monitor (Inflated Price)',
        quantity: 10,
        unitPricePaise: 970000, // ₹9,700
        lineTotalPaise: 9700000,
        productId: "prod-monitor-24",
        createdAt: "2026-08-24T10:00:00.000Z",
        product: mockProducts[5],
      },
    ],
  },
];
