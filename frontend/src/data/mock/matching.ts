import type { ThreeWayMatch } from "@/types/matching";

export const mockMatches: ThreeWayMatch[] = [
  // --------------------------------------------------------------------------
  // Match 1: [SUCCESS] 12/12 Checks Passed
  // --------------------------------------------------------------------------
  {
    id: "twm-demo-001",
    organizationId: "dev-org",
    invoiceId: "inv-demo-001",
    purchaseOrderId: "po-demo-001",
    goodsReceiptId: "gr-demo-001",
    status: "MATCHED",
    totalChecks: 12,
    passedChecks: 12,
    failedChecks: 0,
    matchedAt: "2026-08-23T15:30:00.000Z",
    createdAt: "2026-08-23T15:30:00.000Z",
    checks: [
      { id: "mc-001-1", threeWayMatchId: "twm-demo-001", checkType: "SUPPLIER", expected: "TechSource Distributors", actual: "TechSource Distributors", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-2", threeWayMatchId: "twm-demo-001", checkType: "PO_NUMBER", expected: "PO-2026-001", actual: "PO-2026-001", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-3", threeWayMatchId: "twm-demo-001", checkType: "PRODUCT", expected: "Wireless Keyboard", actual: "Wireless Keyboard", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-4", threeWayMatchId: "twm-demo-001", checkType: "ORDERED_QUANTITY", expected: "100", actual: "100", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-5", threeWayMatchId: "twm-demo-001", checkType: "RECEIVED_QUANTITY", expected: "100", actual: "100", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-6", threeWayMatchId: "twm-demo-001", checkType: "INVOICED_QUANTITY", expected: "100", actual: "100", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-7", threeWayMatchId: "twm-demo-001", checkType: "UNIT_PRICE", expected: "₹1,820.00", actual: "₹1,820.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-8", threeWayMatchId: "twm-demo-001", checkType: "SUBTOTAL", expected: "₹1,82,000.00", actual: "₹1,82,000.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-9", threeWayMatchId: "twm-demo-001", checkType: "TAX", expected: "₹32,760.00", actual: "₹32,760.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-10", threeWayMatchId: "twm-demo-001", checkType: "TOTAL", expected: "₹2,14,760.00", actual: "₹2,14,760.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-11", threeWayMatchId: "twm-demo-001", checkType: "CURRENCY", expected: "INR", actual: "INR", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
      { id: "mc-001-12", threeWayMatchId: "twm-demo-001", checkType: "DUPLICATE_INVOICE", expected: "Unique", actual: "Unique", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T15:30:00.000Z" },
    ],
  },

  // --------------------------------------------------------------------------
  // Match 2: [QTY MISMATCH] Received 98 vs Invoiced 100
  // --------------------------------------------------------------------------
  {
    id: "twm-demo-002",
    organizationId: "dev-org",
    invoiceId: "inv-demo-002",
    purchaseOrderId: "po-demo-002",
    goodsReceiptId: "gr-demo-002",
    status: "MISMATCHED",
    totalChecks: 12,
    passedChecks: 11,
    failedChecks: 1,
    matchedAt: "2026-08-23T17:00:00.000Z",
    createdAt: "2026-08-23T17:00:00.000Z",
    checks: [
      { id: "mc-002-1", threeWayMatchId: "twm-demo-002", checkType: "SUPPLIER", expected: "TechSource Distributors", actual: "TechSource Distributors", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-2", threeWayMatchId: "twm-demo-002", checkType: "PO_NUMBER", expected: "PO-2026-002", actual: "PO-2026-002", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-3", threeWayMatchId: "twm-demo-002", checkType: "PRODUCT", expected: "Wireless Mouse", actual: "Wireless Mouse", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-4", threeWayMatchId: "twm-demo-002", checkType: "ORDERED_QUANTITY", expected: "100", actual: "100", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-5", threeWayMatchId: "twm-demo-002", checkType: "RECEIVED_QUANTITY", expected: "100 (Invoiced)", actual: "98 (Accepted at Warehouse)", passed: false, variance: -2.0, severity: "CRITICAL", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-6", threeWayMatchId: "twm-demo-002", checkType: "INVOICED_QUANTITY", expected: "100", actual: "100", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-7", threeWayMatchId: "twm-demo-002", checkType: "UNIT_PRICE", expected: "₹450.00", actual: "₹450.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-8", threeWayMatchId: "twm-demo-002", checkType: "SUBTOTAL", expected: "₹45,000.00", actual: "₹45,000.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-9", threeWayMatchId: "twm-demo-002", checkType: "TAX", expected: "₹8,100.00", actual: "₹8,100.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-10", threeWayMatchId: "twm-demo-002", checkType: "TOTAL", expected: "₹53,100.00", actual: "₹53,100.00", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-11", threeWayMatchId: "twm-demo-002", checkType: "CURRENCY", expected: "INR", actual: "INR", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
      { id: "mc-002-12", threeWayMatchId: "twm-demo-002", checkType: "DUPLICATE_INVOICE", expected: "Unique", actual: "Unique", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-23T17:00:00.000Z" },
    ],
  },

  // --------------------------------------------------------------------------
  // Match 3: [PRICE MISMATCH] Unit price ₹8,400 expected vs ₹9,700 actual
  // --------------------------------------------------------------------------
  {
    id: "twm-demo-003",
    organizationId: "dev-org",
    invoiceId: "inv-demo-003",
    purchaseOrderId: "po-demo-003",
    goodsReceiptId: "gr-demo-003",
    status: "MISMATCHED",
    totalChecks: 12,
    passedChecks: 9,
    failedChecks: 3,
    matchedAt: "2026-08-24T12:00:00.000Z",
    createdAt: "2026-08-24T12:00:00.000Z",
    checks: [
      { id: "mc-003-1", threeWayMatchId: "twm-demo-003", checkType: "SUPPLIER", expected: "TechSource Distributors", actual: "TechSource Distributors", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-2", threeWayMatchId: "twm-demo-003", checkType: "PO_NUMBER", expected: "PO-2026-003", actual: "PO-2026-003", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-3", threeWayMatchId: "twm-demo-003", checkType: "PRODUCT", expected: '24" Monitor', actual: '24" Monitor', passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-4", threeWayMatchId: "twm-demo-003", checkType: "ORDERED_QUANTITY", expected: "10", actual: "10", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-5", threeWayMatchId: "twm-demo-003", checkType: "RECEIVED_QUANTITY", expected: "10", actual: "10", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-6", threeWayMatchId: "twm-demo-003", checkType: "INVOICED_QUANTITY", expected: "10", actual: "10", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-7", threeWayMatchId: "twm-demo-003", checkType: "UNIT_PRICE", expected: "₹8,400.00 (PO)", actual: "₹9,700.00 (Invoice)", passed: false, variance: 15.48, severity: "CRITICAL", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-8", threeWayMatchId: "twm-demo-003", checkType: "SUBTOTAL", expected: "₹84,000.00 (PO)", actual: "₹97,000.00 (Invoice)", passed: false, variance: 15.48, severity: "CRITICAL", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-9", threeWayMatchId: "twm-demo-003", checkType: "TAX", expected: "₹15,120.00", actual: "₹17,460.00", passed: false, variance: 15.48, severity: "WARNING", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-10", threeWayMatchId: "twm-demo-003", checkType: "TOTAL", expected: "₹99,120.00 (PO)", actual: "₹1,14,460.00 (Invoice)", passed: false, variance: 15.48, severity: "CRITICAL", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-11", threeWayMatchId: "twm-demo-003", checkType: "CURRENCY", expected: "INR", actual: "INR", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
      { id: "mc-003-12", threeWayMatchId: "twm-demo-003", checkType: "DUPLICATE_INVOICE", expected: "Unique", actual: "Unique", passed: true, variance: 0, severity: "INFO", createdAt: "2026-08-24T12:00:00.000Z" },
    ],
  },
];
