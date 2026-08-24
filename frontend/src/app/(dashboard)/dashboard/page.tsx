import { Activity, PlusCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-lg border border-border bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Intelligent Procurement Operations
            </h2>
            <p className="text-sm text-muted">
              Manage your procurement lifecycle from requisition to payment.
            </p>
          </div>
        </div>
      </div>

      {/* Procurement Overview & Quick Actions */}
      <div className="rounded-lg border border-border bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Procurement Overview
        </h3>
        <p className="text-sm text-muted leading-relaxed mb-6 max-w-2xl">
          Manage your procurement lifecycle across requisitions, supplier sourcing,
          purchase orders, invoices and payments.
        </p>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/procurement/requisitions"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              <PlusCircle className="h-4 w-4" />
              Create Requisition
            </Link>
            <Link
              href="/procurement/purchase-orders"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <ShoppingCart className="h-4 w-4 text-slate-500" />
              View Purchase Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
