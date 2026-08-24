import type { Supplier, Product, SupplierProduct } from "@/types/supplier";

export const mockSuppliers: Supplier[] = [
  {
    id: "sup-techsource",
    organizationId: "dev-org",
    name: "TechSource Distributors",
    email: "sales@techsource.example",
    phone: "+91 98765 43210",
    rating: 4.6,
    reliabilityScore: 0.95,
    isActive: true,
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "sup-global-office",
    organizationId: "dev-org",
    name: "Global Office Supplies",
    email: "orders@globaloffice.example",
    phone: "+91 98111 22334",
    rating: 4.2,
    reliabilityScore: 0.88,
    isActive: true,
    createdAt: "2026-08-02T11:00:00.000Z",
  },
  {
    id: "sup-budget-bulk",
    organizationId: "dev-org",
    name: "BudgetBulk Traders",
    email: "hello@budgetbulk.example",
    phone: "+91 98222 33445",
    rating: 3.6,
    reliabilityScore: 0.72,
    isActive: true,
    createdAt: "2026-08-03T12:00:00.000Z",
  },
];

export const mockProducts: Product[] = [
  { id: "prod-wireless-keyboard", organizationId: "dev-org", sku: "PRPH-KB-001", name: "Wireless Keyboard", category: "PERIPHERALS", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-wireless-mouse", organizationId: "dev-org", sku: "PRPH-MS-001", name: "Wireless Mouse", category: "PERIPHERALS", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-hd-webcam", organizationId: "dev-org", sku: "PRPH-WC-001", name: "HD Webcam", category: "PERIPHERALS", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-headset", organizationId: "dev-org", sku: "PRPH-HS-001", name: "USB Headset", category: "PERIPHERALS", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-laptop-14", organizationId: "dev-org", sku: "CMPT-LT-001", name: '14" Laptop', category: "COMPUTING", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-monitor-24", organizationId: "dev-org", sku: "CMPT-MN-001", name: '24" Monitor', category: "COMPUTING", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-usbc-dock", organizationId: "dev-org", sku: "CMPT-DK-001", name: "USB-C Docking Station", category: "COMPUTING", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-ssd-1tb", organizationId: "dev-org", sku: "CMPT-SSD-001", name: "1TB External SSD", category: "COMPUTING", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-projector", organizationId: "dev-org", sku: "CMPT-PJ-001", name: "HD Projector", category: "COMPUTING", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-office-chair", organizationId: "dev-org", sku: "FURN-CH-001", name: "Ergonomic Office Chair", category: "FURNITURE", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-standing-desk", organizationId: "dev-org", sku: "FURN-DK-001", name: "Standing Desk", category: "FURNITURE", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-a4-paper", organizationId: "dev-org", sku: "STNY-PP-001", name: "A4 Paper Ream", category: "STATIONERY", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-printer-toner", organizationId: "dev-org", sku: "STNY-TN-001", name: "Printer Toner Cartridge", category: "STATIONERY", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-ethernet-cable", organizationId: "dev-org", sku: "NETW-CB-001", name: "Ethernet Cable (5m)", category: "NETWORKING", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
  { id: "prod-ups-600va", organizationId: "dev-org", sku: "NETW-UPS-001", name: "600VA UPS", category: "NETWORKING", unit: "unit", createdAt: "2026-08-01T10:00:00Z" },
];

export const mockSupplierProducts: SupplierProduct[] = [
  // Wireless Keyboard
  { id: "sp-keyboard-techsource", supplierId: "sup-techsource", productId: "prod-wireless-keyboard", unitPricePaise: 182000, currency: "INR", stockQuantity: 500, deliveryDays: 5, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },
  { id: "sp-keyboard-global", supplierId: "sup-global-office", productId: "prod-wireless-keyboard", unitPricePaise: 195000, currency: "INR", stockQuantity: 300, deliveryDays: 8, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },
  { id: "sp-keyboard-budget", supplierId: "sup-budget-bulk", productId: "prod-wireless-keyboard", unitPricePaise: 170000, currency: "INR", stockQuantity: 40, deliveryDays: 4, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },

  // Wireless Mouse
  { id: "sp-mouse-techsource", supplierId: "sup-techsource", productId: "prod-wireless-mouse", unitPricePaise: 45000, currency: "INR", stockQuantity: 120, deliveryDays: 4, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },
  { id: "sp-mouse-global", supplierId: "sup-global-office", productId: "prod-wireless-mouse", unitPricePaise: 48000, currency: "INR", stockQuantity: 200, deliveryDays: 6, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },

  // 24" Monitor
  { id: "sp-monitor-techsource", supplierId: "sup-techsource", productId: "prod-monitor-24", unitPricePaise: 840000, currency: "INR", stockQuantity: 80, deliveryDays: 6, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },
  { id: "sp-monitor-global", supplierId: "sup-global-office", productId: "prod-monitor-24", unitPricePaise: 899000, currency: "INR", stockQuantity: 60, deliveryDays: 5, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },

  // HD Projector
  { id: "sp-projector-techsource", supplierId: "sup-techsource", productId: "prod-projector", unitPricePaise: 4500000, currency: "INR", stockQuantity: 3, deliveryDays: 10, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },
  { id: "sp-projector-global", supplierId: "sup-global-office", productId: "prod-projector", unitPricePaise: 3900000, currency: "INR", stockQuantity: 0, deliveryDays: 12, minOrderQuantity: 1, createdAt: "2026-08-01T10:00:00Z" },
];
