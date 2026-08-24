import type { Exception } from "@/types/exception";

export const mockExceptions: Exception[] = [
  // --------------------------------------------------------------------------
  // Exception 1: [Scenario 2 - QTY MISMATCH]
  // --------------------------------------------------------------------------
  {
    id: "exp-demo-001",
    organizationId: "dev-org",
    type: "QUANTITY_MISMATCH",
    status: "OPEN",
    severity: "CRITICAL",
    entityType: "INVOICE",
    entityId: "inv-demo-002",
    title: "Short Delivery Quantity Mismatch",
    description: "Invoice INV-TS-2026-8802 bills for 100 units of Wireless Mouse, but physical Goods Receipt GR-2026-002 accepted only 98 units (2 units damaged in transit). Payment is blocked.",
    metadata: {
      poNumber: "PO-2026-002",
      invoicedQuantity: 100,
      receivedQuantity: 98,
      damagedQuantity: 2,
      variancePaise: 90000, // ₹900 overbilled
    },
    createdAt: "2026-08-23T17:01:00.000Z",
    updatedAt: "2026-08-23T17:01:00.000Z",
  },

  // --------------------------------------------------------------------------
  // Exception 2: [Scenario 3 - PRICE MISMATCH]
  // --------------------------------------------------------------------------
  {
    id: "exp-demo-002",
    organizationId: "dev-org",
    type: "PRICE_MISMATCH",
    status: "UNDER_REVIEW",
    severity: "CRITICAL",
    entityType: "INVOICE",
    entityId: "inv-demo-003",
    title: "Unit Price Contract Variance",
    description: "Invoice INV-TS-2026-8803 charges ₹9,700.00/unit for 24\" Monitors against the approved Purchase Order PO-2026-003 contract rate of ₹8,400.00/unit (+15.48% inflation).",
    metadata: {
      poNumber: "PO-2026-003",
      contractedUnitPricePaise: 840000,
      invoicedUnitPricePaise: 970000,
      unitVariancePaise: 130000,
      totalDiscrepancyPaise: 1534000, // ₹15,340 total variance including tax
    },
    createdAt: "2026-08-24T12:01:00.000Z",
    updatedAt: "2026-08-24T12:30:00.000Z",
  },

  // --------------------------------------------------------------------------
  // Exception 3: [Scenario 4 - NO SUPPLIER FOUND]
  // --------------------------------------------------------------------------
  {
    id: "exp-demo-003",
    organizationId: "dev-org",
    type: "NO_SUPPLIER_FOUND",
    status: "OPEN",
    severity: "CRITICAL",
    entityType: "REQUISITION",
    entityId: "req-demo-004",
    title: "No Eligible Sourcing Partner",
    description: "Automated supplier discovery could not find any active supplier meeting the required constraints (50 HD Projectors at max ₹25,000 within 5 days).",
    metadata: {
      requisitionId: "req-demo-004",
      requestedQuantity: 50,
      budgetLimitPaise: 2500000,
      reasons: [
        "TechSource Distributors: Stock 3 units < 50 units needed, price ₹45,000 > ₹25,000 ceiling",
        "Global Office Supplies: Out of stock (0 units), price ₹39,000 > ₹25,000 ceiling",
      ],
    },
    createdAt: "2026-08-23T14:02:00.000Z",
    updatedAt: "2026-08-23T14:02:00.000Z",
  },

  // --------------------------------------------------------------------------
  // Exception 4: [PO APPROVAL REQUIRED - RESOLVED]
  // --------------------------------------------------------------------------
  {
    id: "exp-demo-004",
    organizationId: "dev-org",
    type: "PO_APPROVAL_REQUIRED",
    status: "RESOLVED",
    severity: "WARNING",
    entityType: "PURCHASE_ORDER",
    entityId: "po-demo-001",
    title: "High Value PO Approval Threshold",
    description: "Purchase Order PO-2026-001 exceeds the ₹1,00,000 threshold (Total: ₹2,14,760) and required authorized human approval.",
    metadata: {
      poNumber: "PO-2026-001",
      thresholdPaise: 10000000, // ₹1,00,000
      orderTotalPaise: 21476000,
    },
    resolution: "APPROVE",
    resolutionReason: "Approved by finance director under approved FY26 Q3 IT peripheral refresh budget allocation.",
    resolvedAt: "2026-08-20T10:00:00.000Z",
    resolvedBy: "finance-admin@example.com",
    createdAt: "2026-08-20T09:35:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
];
