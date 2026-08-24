import { cn } from "@/lib/utils";
import type { Severity } from "@/types/enums";

interface SeverityBadgeProps {
  severity: Severity | string;
  className?: string;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; style: string; dot: string }> = {
  INFO: {
    label: "Info",
    style: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  WARNING: {
    label: "Warning",
    style: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  CRITICAL: {
    label: "Critical",
    style: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const normalized = severity.toUpperCase() as Severity;
  const config = SEVERITY_CONFIG[normalized] || {
    label: severity,
    style: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        config.style,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
