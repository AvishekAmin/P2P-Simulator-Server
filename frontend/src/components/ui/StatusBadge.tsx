import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_CONFIG: Record<string, { label: string; variant: StatusVariant }> = {
  // Common
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "neutral" },

  // Requisition
  CREATED: { label: "Created", variant: "neutral" },
  PROCESSING: { label: "Processing", variant: "info" },
  REQUIREMENTS_EXTRACTED: { label: "Extracted", variant: "info" },
  SUPPLIER_SELECTED: { label: "Supplier Selected", variant: "info" },
  PO_CREATED: { label: "PO Created", variant: "success" },
  NEEDS_CLARIFICATION: { label: "Clarification Needed", variant: "warning" },
  FAILED: { label: "Failed", variant: "danger" },

  // Purchase Order
  DRAFT: { label: "Draft", variant: "neutral" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  SHIPPED: { label: "Shipped", variant: "info" },
  RECEIVED: { label: "Received", variant: "success" },
  COMPLETED: { label: "Completed", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },

  // Shipment
  IN_TRANSIT: { label: "In Transit", variant: "info" },
  DELIVERED: { label: "Delivered", variant: "success" },

  // Goods Receipt
  PENDING: { label: "Pending", variant: "warning" },
  PARTIAL: { label: "Partial", variant: "warning" },

  // Invoice
  UPLOADED: { label: "Uploaded", variant: "neutral" },
  EXTRACTED: { label: "Extracted", variant: "info" },
  MATCHING: { label: "Matching", variant: "info" },
  EXCEPTION: { label: "Exception", variant: "danger" },
  PAID: { label: "Paid", variant: "success" },

  // Matching
  MATCHED: { label: "Matched", variant: "success" },
  MISMATCHED: { label: "Mismatched", variant: "danger" },

  // Payment
  BLOCKED: { label: "Blocked", variant: "danger" },

  // Exception Lifecycle
  OPEN: { label: "Open", variant: "danger" },
  UNDER_REVIEW: { label: "Under Review", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, " "),
    variant: "neutral" as StatusVariant,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide",
        VARIANT_STYLES[config.variant],
        className
      )}
    >
      {config.label}
    </span>
  );
}
