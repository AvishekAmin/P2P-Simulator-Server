import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

// Demo catalog for the P2P MVP. Deterministic ids + upsert so this is safe to
// re-run (`pnpm run prisma:seed`) without producing duplicates.
//
// The organization id below MUST match DEV_ORGANIZATION_ID (src/config/env.ts,
// src/middleware/auth.ts) since there is no real authentication yet.

const ORG_ID = "dev-org";

const SUPPLIERS = {
  techsource: {
    id: "sup-techsource",
    name: "TechSource Distributors",
    email: "sales@techsource.example",
    rating: 4.6,
    reliabilityScore: 0.95,
  },
  globalOffice: {
    id: "sup-global-office",
    name: "Global Office Supplies",
    email: "orders@globaloffice.example",
    rating: 4.2,
    reliabilityScore: 0.88,
  },
  budgetBulk: {
    id: "sup-budget-bulk",
    name: "BudgetBulk Traders",
    email: "hello@budgetbulk.example",
    rating: 3.6,
    reliabilityScore: 0.72,
  },
} as const;

const PRODUCTS = [
  { id: "prod-wireless-keyboard", sku: "PRPH-KB-001", name: "Wireless Keyboard", category: "PERIPHERALS" },
  { id: "prod-wireless-mouse", sku: "PRPH-MS-001", name: "Wireless Mouse", category: "PERIPHERALS" },
  { id: "prod-hd-webcam", sku: "PRPH-WC-001", name: "HD Webcam", category: "PERIPHERALS" },
  { id: "prod-headset", sku: "PRPH-HS-001", name: "USB Headset", category: "PERIPHERALS" },
  { id: "prod-laptop-14", sku: "CMPT-LT-001", name: '14" Laptop', category: "COMPUTING" },
  { id: "prod-monitor-24", sku: "CMPT-MN-001", name: '24" Monitor', category: "COMPUTING" },
  { id: "prod-usbc-dock", sku: "CMPT-DK-001", name: "USB-C Docking Station", category: "COMPUTING" },
  { id: "prod-ssd-1tb", sku: "CMPT-SSD-001", name: "1TB External SSD", category: "COMPUTING" },
  { id: "prod-projector", sku: "CMPT-PJ-001", name: "HD Projector", category: "COMPUTING" },
  { id: "prod-office-chair", sku: "FURN-CH-001", name: "Ergonomic Office Chair", category: "FURNITURE" },
  { id: "prod-standing-desk", sku: "FURN-DK-001", name: "Standing Desk", category: "FURNITURE" },
  { id: "prod-a4-paper", sku: "STNY-PP-001", name: "A4 Paper Ream", category: "STATIONERY" },
  { id: "prod-printer-toner", sku: "STNY-TN-001", name: "Printer Toner Cartridge", category: "STATIONERY" },
  { id: "prod-ethernet-cable", sku: "NETW-CB-001", name: "Ethernet Cable (5m)", category: "NETWORKING" },
  { id: "prod-ups-600va", sku: "NETW-UPS-001", name: "600VA UPS", category: "NETWORKING" },
] as const;

type SupplierProductSeed = {
  id: string;
  supplierId: string;
  productId: string;
  unitPricePaise: number;
  stockQuantity: number;
  deliveryDays: number;
  minOrderQuantity?: number;
};

// Offers are annotated with which demo scenario they support:
//   [SUCCESS]           happy-path procurement (eligible, cheapest wins)
//   [QTY MISMATCH]      demo under-delivers on receipt
//   [PRICE MISMATCH]    demo invoice inflates the unit price
//   [NO SUPPLIER FOUND] every offer fails eligibility (out of stock / too expensive)
const SUPPLIER_PRODUCTS: SupplierProductSeed[] = [
  // --- Wireless Keyboard — [SUCCESS] -----------------------------------
  // "100 wireless keyboards under ₹2000 each within 7 days"
  // TechSource is eligible and cheapest -> wins deterministic ranking.
  {
    id: "sp-keyboard-techsource",
    supplierId: SUPPLIERS.techsource.id,
    productId: "prod-wireless-keyboard",
    unitPricePaise: 182_000, // ₹1,820
    stockQuantity: 500,
    deliveryDays: 5,
  },
  {
    id: "sp-keyboard-global",
    supplierId: SUPPLIERS.globalOffice.id,
    productId: "prod-wireless-keyboard",
    unitPricePaise: 195_000, // ₹1,950
    stockQuantity: 300,
    deliveryDays: 8, // fails delivery deadline
  },
  {
    id: "sp-keyboard-budget",
    supplierId: SUPPLIERS.budgetBulk.id,
    productId: "prod-wireless-keyboard",
    unitPricePaise: 170_000, // ₹1,700 — cheapest, but ineligible on stock
    stockQuantity: 40,
    deliveryDays: 4,
  },

  // --- Wireless Mouse — [QTY MISMATCH] ---------------------------------
  // Demo orders 100; receipt simulates 98 received / 2 damaged.
  {
    id: "sp-mouse-techsource",
    supplierId: SUPPLIERS.techsource.id,
    productId: "prod-wireless-mouse",
    unitPricePaise: 45_000, // ₹450
    stockQuantity: 120,
    deliveryDays: 4,
  },
  {
    id: "sp-mouse-global",
    supplierId: SUPPLIERS.globalOffice.id,
    productId: "prod-wireless-mouse",
    unitPricePaise: 48_000,
    stockQuantity: 200,
    deliveryDays: 6,
  },

  // --- 24" Monitor — [PRICE MISMATCH] -----------------------------------
  // Winning price ₹8,400; demo invoice inflates to ₹9,700 for an obvious variance.
  {
    id: "sp-monitor-techsource",
    supplierId: SUPPLIERS.techsource.id,
    productId: "prod-monitor-24",
    unitPricePaise: 840_000, // ₹8,400
    stockQuantity: 80,
    deliveryDays: 6,
  },
  {
    id: "sp-monitor-global",
    supplierId: SUPPLIERS.globalOffice.id,
    productId: "prod-monitor-24",
    unitPricePaise: 899_000,
    stockQuantity: 60,
    deliveryDays: 5,
  },

  // --- HD Projector — [NO SUPPLIER FOUND] --------------------------------
  // Every offer is either out of stock or too expensive.
  {
    id: "sp-projector-techsource",
    supplierId: SUPPLIERS.techsource.id,
    productId: "prod-projector",
    unitPricePaise: 4_500_000, // ₹45,000 — over typical budget ceilings
    stockQuantity: 3,
    deliveryDays: 10,
  },
  {
    id: "sp-projector-global",
    supplierId: SUPPLIERS.globalOffice.id,
    productId: "prod-projector",
    unitPricePaise: 3_900_000,
    stockQuantity: 0, // out of stock
    deliveryDays: 12,
  },

  // --- Remaining catalog: general-purpose offers across all 3 suppliers ---
  { id: "sp-webcam-techsource", supplierId: SUPPLIERS.techsource.id, productId: "prod-hd-webcam", unitPricePaise: 320_000, stockQuantity: 150, deliveryDays: 4 },
  { id: "sp-webcam-global", supplierId: SUPPLIERS.globalOffice.id, productId: "prod-hd-webcam", unitPricePaise: 350_000, stockQuantity: 90, deliveryDays: 5 },

  { id: "sp-headset-budget", supplierId: SUPPLIERS.budgetBulk.id, productId: "prod-headset", unitPricePaise: 120_000, stockQuantity: 250, deliveryDays: 3 },
  { id: "sp-headset-techsource", supplierId: SUPPLIERS.techsource.id, productId: "prod-headset", unitPricePaise: 135_000, stockQuantity: 180, deliveryDays: 4 },

  { id: "sp-laptop-techsource", supplierId: SUPPLIERS.techsource.id, productId: "prod-laptop-14", unitPricePaise: 3_800_000, stockQuantity: 50, deliveryDays: 7 },
  { id: "sp-laptop-global", supplierId: SUPPLIERS.globalOffice.id, productId: "prod-laptop-14", unitPricePaise: 3_950_000, stockQuantity: 35, deliveryDays: 6 },

  { id: "sp-dock-techsource", supplierId: SUPPLIERS.techsource.id, productId: "prod-usbc-dock", unitPricePaise: 280_000, stockQuantity: 100, deliveryDays: 5 },

  { id: "sp-ssd-techsource", supplierId: SUPPLIERS.techsource.id, productId: "prod-ssd-1tb", unitPricePaise: 550_000, stockQuantity: 75, deliveryDays: 5 },
  { id: "sp-ssd-budget", supplierId: SUPPLIERS.budgetBulk.id, productId: "prod-ssd-1tb", unitPricePaise: 480_000, stockQuantity: 60, deliveryDays: 6 },

  { id: "sp-chair-globaloffice", supplierId: SUPPLIERS.globalOffice.id, productId: "prod-office-chair", unitPricePaise: 650_000, stockQuantity: 40, deliveryDays: 9 },
  { id: "sp-chair-budget", supplierId: SUPPLIERS.budgetBulk.id, productId: "prod-office-chair", unitPricePaise: 520_000, stockQuantity: 30, deliveryDays: 12 },

  { id: "sp-desk-globaloffice", supplierId: SUPPLIERS.globalOffice.id, productId: "prod-standing-desk", unitPricePaise: 1_800_000, stockQuantity: 20, deliveryDays: 10 },

  { id: "sp-paper-budget", supplierId: SUPPLIERS.budgetBulk.id, productId: "prod-a4-paper", unitPricePaise: 24_000, stockQuantity: 1000, deliveryDays: 2, minOrderQuantity: 5 },
  { id: "sp-paper-globaloffice", supplierId: SUPPLIERS.globalOffice.id, productId: "prod-a4-paper", unitPricePaise: 26_000, stockQuantity: 800, deliveryDays: 3 },

  { id: "sp-toner-globaloffice", supplierId: SUPPLIERS.globalOffice.id, productId: "prod-printer-toner", unitPricePaise: 180_000, stockQuantity: 120, deliveryDays: 3 },
  { id: "sp-toner-budget", supplierId: SUPPLIERS.budgetBulk.id, productId: "prod-printer-toner", unitPricePaise: 160_000, stockQuantity: 90, deliveryDays: 4 },

  { id: "sp-ethernet-techsource", supplierId: SUPPLIERS.techsource.id, productId: "prod-ethernet-cable", unitPricePaise: 35_000, stockQuantity: 400, deliveryDays: 3 },
  { id: "sp-ethernet-budget", supplierId: SUPPLIERS.budgetBulk.id, productId: "prod-ethernet-cable", unitPricePaise: 28_000, stockQuantity: 500, deliveryDays: 4 },

  { id: "sp-ups-techsource", supplierId: SUPPLIERS.techsource.id, productId: "prod-ups-600va", unitPricePaise: 420_000, stockQuantity: 65, deliveryDays: 6 },
];

async function main(): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: "Demo Manufacturing Pvt Ltd",
      currency: "INR",
    },
  });

  for (const supplier of Object.values(SUPPLIERS)) {
    await prisma.supplier.upsert({
      where: { id: supplier.id },
      update: {
        name: supplier.name,
        email: supplier.email,
        rating: supplier.rating,
        reliabilityScore: supplier.reliabilityScore,
      },
      create: {
        id: supplier.id,
        organizationId: organization.id,
        name: supplier.name,
        email: supplier.email,
        rating: supplier.rating,
        reliabilityScore: supplier.reliabilityScore,
      },
    });
  }

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        category: product.category,
      },
      create: {
        id: product.id,
        organizationId: organization.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
      },
    });
  }

  for (const offer of SUPPLIER_PRODUCTS) {
    await prisma.supplierProduct.upsert({
      where: { id: offer.id },
      update: {
        unitPricePaise: offer.unitPricePaise,
        stockQuantity: offer.stockQuantity,
        deliveryDays: offer.deliveryDays,
        minOrderQuantity: offer.minOrderQuantity ?? 1,
      },
      create: {
        id: offer.id,
        supplierId: offer.supplierId,
        productId: offer.productId,
        unitPricePaise: offer.unitPricePaise,
        stockQuantity: offer.stockQuantity,
        deliveryDays: offer.deliveryDays,
        minOrderQuantity: offer.minOrderQuantity ?? 1,
      },
    });
  }

  // --- Seed Demo Requisitions -------------------------------------------
  // Demo Scenario 1: [SUCCESS] Happy path -> TechSource selected
  const req1 = await prisma.requisition.upsert({
    where: { id: "req-demo-001" },
    update: {},
    create: {
      id: "req-demo-001",
      organizationId: organization.id,
      rawInput: "100 wireless keyboards under ₹2000 each within 7 days",
      status: "SUPPLIER_SELECTED",
      turnCount: 1,
      createdBy: "dev-user",
    },
  });

  await prisma.requirement.upsert({
    where: { requisitionId: req1.id },
    update: {},
    create: {
      requisitionId: req1.id,
      productName: "Wireless Keyboard",
      category: "PERIPHERALS",
      quantity: 100,
      maxUnitPricePaise: 200_000,
      deliveryDeadlineDays: 7,
      currency: "INR",
      confidence: 0.98,
      rawExtraction: { item: "Wireless Keyboard", quantity: 100, maxPrice: 2000, days: 7 },
    },
  });

  await prisma.supplierCandidate.upsert({
    where: { requisitionId_supplierId: { requisitionId: req1.id, supplierId: SUPPLIERS.techsource.id } },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req1.id,
      supplierId: SUPPLIERS.techsource.id,
      supplierProductId: "sp-keyboard-techsource",
      eligible: true,
      priceScore: 100,
      deliveryScore: 100,
      reliabilityScore: 95,
      ratingScore: 92,
      stockScore: 100,
      totalScore: 97.8,
      rank: 1,
      unitPricePaise: 182_000,
      deliveryDays: 5,
      availableStock: 500,
    },
  });

  await prisma.supplierCandidate.upsert({
    where: { requisitionId_supplierId: { requisitionId: req1.id, supplierId: SUPPLIERS.globalOffice.id } },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req1.id,
      supplierId: SUPPLIERS.globalOffice.id,
      supplierProductId: "sp-keyboard-global",
      eligible: false,
      ineligibleReason: "Delivery in 8 days exceeds the 7-day deadline",
      priceScore: 0,
      deliveryScore: 0,
      reliabilityScore: 0,
      ratingScore: 0,
      stockScore: 0,
      totalScore: 0,
      rank: 2,
      unitPricePaise: 195_000,
      deliveryDays: 8,
      availableStock: 300,
    },
  });

  await prisma.supplierCandidate.upsert({
    where: { requisitionId_supplierId: { requisitionId: req1.id, supplierId: SUPPLIERS.budgetBulk.id } },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req1.id,
      supplierId: SUPPLIERS.budgetBulk.id,
      supplierProductId: "sp-keyboard-budget",
      eligible: false,
      ineligibleReason: "Stock 40 is below the required 100",
      priceScore: 0,
      deliveryScore: 0,
      reliabilityScore: 0,
      ratingScore: 0,
      stockScore: 0,
      totalScore: 0,
      rank: 3,
      unitPricePaise: 170_000,
      deliveryDays: 4,
      availableStock: 40,
    },
  });

  await prisma.sourcingDecision.upsert({
    where: { requisitionId: req1.id },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req1.id,
      selectedSupplierId: SUPPLIERS.techsource.id,
      selectedSupplierProductId: "sp-keyboard-techsource",
      totalScore: 97.8,
      candidatesEvaluated: 3,
      rationale: "TechSource Distributors offered the lowest eligible unit price at ₹1,820 with 5-day delivery (within the 7-day deadline) and 500 units in stock.",
    },
  });

  // Demo Scenario 2: [QTY MISMATCH] -> PO Created
  const req2 = await prisma.requisition.upsert({
    where: { id: "req-demo-002" },
    update: {},
    create: {
      id: "req-demo-002",
      organizationId: organization.id,
      rawInput: "100 wireless mouse under ₹500 within 5 days",
      status: "PO_CREATED",
      turnCount: 1,
      createdBy: "dev-user",
    },
  });

  await prisma.requirement.upsert({
    where: { requisitionId: req2.id },
    update: {},
    create: {
      requisitionId: req2.id,
      productName: "Wireless Mouse",
      category: "PERIPHERALS",
      quantity: 100,
      maxUnitPricePaise: 50_000,
      deliveryDeadlineDays: 5,
      currency: "INR",
      confidence: 0.96,
      rawExtraction: { item: "Wireless Mouse", quantity: 100, maxPrice: 500, days: 5 },
    },
  });

  await prisma.sourcingDecision.upsert({
    where: { requisitionId: req2.id },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req2.id,
      selectedSupplierId: SUPPLIERS.techsource.id,
      selectedSupplierProductId: "sp-mouse-techsource",
      totalScore: 96.5,
      candidatesEvaluated: 2,
      rationale: "TechSource Distributors selected with ₹450 unit price, 4 days delivery, and 120 stock.",
    },
  });

  await prisma.purchaseOrder.upsert({
    where: { requisitionId: req2.id },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req2.id,
      poNumber: "PO-20260824-001",
      supplierId: SUPPLIERS.techsource.id,
      status: "APPROVED",
      subtotalPaise: 45_000 * 100,
      taxPaise: Math.round(45_000 * 100 * 0.18),
      totalPaise: 45_000 * 100 + Math.round(45_000 * 100 * 0.18),
      taxRateBps: 1800,
    },
  });

  // Demo Scenario 3: [PRICE MISMATCH] -> Requirements Extracted
  const req3 = await prisma.requisition.upsert({
    where: { id: "req-demo-003" },
    update: {},
    create: {
      id: "req-demo-003",
      organizationId: organization.id,
      rawInput: "10 24-inch monitors under ₹9000 within 7 days",
      status: "REQUIREMENTS_EXTRACTED",
      turnCount: 1,
      createdBy: "dev-user",
    },
  });

  await prisma.requirement.upsert({
    where: { requisitionId: req3.id },
    update: {},
    create: {
      requisitionId: req3.id,
      productName: '24" Monitor',
      category: "COMPUTING",
      quantity: 10,
      maxUnitPricePaise: 900_000,
      deliveryDeadlineDays: 7,
      currency: "INR",
      confidence: 0.95,
      rawExtraction: { item: '24" Monitor', quantity: 10, maxPrice: 9000, days: 7 },
    },
  });

  // Demo Scenario 4: [NO SUPPLIER FOUND] -> Failed
  const req4 = await prisma.requisition.upsert({
    where: { id: "req-demo-004" },
    update: {},
    create: {
      id: "req-demo-004",
      organizationId: organization.id,
      rawInput: "5 HD Projectors under ₹30000 within 5 days",
      status: "FAILED",
      failureReason: "No eligible supplier found matching budget and delivery deadline.",
      turnCount: 1,
      createdBy: "dev-user",
    },
  });

  await prisma.supplierCandidate.upsert({
    where: { requisitionId_supplierId: { requisitionId: req4.id, supplierId: SUPPLIERS.techsource.id } },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req4.id,
      supplierId: SUPPLIERS.techsource.id,
      supplierProductId: "sp-projector-techsource",
      eligible: false,
      ineligibleReason: "Unit price ₹45,000 exceeds ₹30,000 budget and delivery in 10 days exceeds 5 days deadline",
      priceScore: 0,
      deliveryScore: 0,
      reliabilityScore: 0,
      ratingScore: 0,
      stockScore: 0,
      totalScore: 0,
      rank: 1,
      unitPricePaise: 4_500_000,
      deliveryDays: 10,
      availableStock: 3,
    },
  });

  await prisma.supplierCandidate.upsert({
    where: { requisitionId_supplierId: { requisitionId: req4.id, supplierId: SUPPLIERS.globalOffice.id } },
    update: {},
    create: {
      organizationId: organization.id,
      requisitionId: req4.id,
      supplierId: SUPPLIERS.globalOffice.id,
      supplierProductId: "sp-projector-global",
      eligible: false,
      ineligibleReason: "Product is out of stock (0 available) and unit price ₹39,000 exceeds ₹30,000 budget",
      priceScore: 0,
      deliveryScore: 0,
      reliabilityScore: 0,
      ratingScore: 0,
      stockScore: 0,
      totalScore: 0,
      rank: 2,
      unitPricePaise: 3_900_000,
      deliveryDays: 12,
      availableStock: 0,
    },
  });

  // Demo Scenario 5: [NEEDS_CLARIFICATION]
  const req5 = await prisma.requisition.upsert({
    where: { id: "req-demo-005" },
    update: {},
    create: {
      id: "req-demo-005",
      organizationId: organization.id,
      rawInput: "Need some laptops",
      status: "NEEDS_CLARIFICATION",
      missingFields: ["quantity", "maxUnitPricePaise", "deliveryDeadlineDays"],
      clarificationMessage: "How many 14\" laptops do you need, what is your budget per unit, and when do you need them delivered?",
      turnCount: 1,
      createdBy: "dev-user",
    },
  });

  await prisma.requisitionMessage.createMany({
    data: [
      {
        organizationId: organization.id,
        requisitionId: req5.id,
        role: "USER",
        content: "Need some laptops",
      },
      {
        organizationId: organization.id,
        requisitionId: req5.id,
        role: "ASSISTANT",
        content: "How many 14\" laptops do you need, what is your budget per unit, and when do you need them delivered?",
      },
    ],
    skipDuplicates: true,
  });

  console.log(
    `Seeded organization "${organization.name}" (${organization.id}) with ` +
      `${Object.keys(SUPPLIERS).length} suppliers, ${PRODUCTS.length} products, ` +
      `${SUPPLIER_PRODUCTS.length} supplier-product offers, and 5 demo requisitions.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
