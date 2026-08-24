import {
  LayoutDashboard,
  FileText,
  Users,
  ShoppingCart,
  Truck,
  PackageCheck,
  Receipt,
  GitCompareArrows,
  CreditCard,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Procurement",
    items: [
      { label: "Requisitions", href: "/procurement/requisitions", icon: FileText },
      { label: "Suppliers", href: "/procurement/suppliers", icon: Users },
      { label: "Purchase Orders", href: "/procurement/purchase-orders", icon: ShoppingCart },
    ],
  },
  {
    title: "Fulfillment",
    items: [
      { label: "Shipments", href: "/logistics/shipments", icon: Truck },
      { label: "Goods Receipts", href: "/logistics/goods-receipts", icon: PackageCheck },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Invoices", href: "/finance/invoices", icon: Receipt },
      { label: "3-Way Matching", href: "/finance/matching", icon: GitCompareArrows },
      { label: "Payments", href: "/finance/payments", icon: CreditCard },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Exceptions", href: "/exceptions", icon: AlertTriangle },
    ],
  },
];
