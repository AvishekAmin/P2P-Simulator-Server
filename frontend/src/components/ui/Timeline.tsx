import type { LucideIcon } from "lucide-react";
import { Check, Circle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineItemStatus = "completed" | "current" | "upcoming" | "error";

export interface TimelineItem {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  status?: TimelineItemStatus;
  icon?: LucideIcon;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("relative space-y-6", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const status = item.status || "upcoming";
        const CustomIcon = item.icon;

        return (
          <div key={item.id || index} className="relative flex gap-4">
            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[13px] top-6 -bottom-6 w-0.5",
                  status === "completed" ? "bg-emerald-500" : "bg-slate-200"
                )}
              />
            )}

            {/* Status node */}
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white shadow-xs">
              {CustomIcon ? (
                <CustomIcon
                  className={cn(
                    "h-3.5 w-3.5",
                    status === "completed" && "text-emerald-600",
                    status === "current" && "text-blue-600",
                    status === "error" && "text-rose-600",
                    status === "upcoming" && "text-slate-400"
                  )}
                />
              ) : status === "completed" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              ) : status === "current" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-blue-50 text-primary">
                  <Circle className="h-2 w-2 fill-primary" />
                </div>
              ) : status === "error" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300">
                  <Circle className="h-1.5 w-1.5 fill-slate-300" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={cn(
                    "text-xs font-semibold sm:text-sm",
                    status === "completed" && "text-foreground",
                    status === "current" && "text-primary font-bold",
                    status === "error" && "text-rose-600 font-bold",
                    status === "upcoming" && "text-slate-500"
                  )}
                >
                  {item.title}
                </h4>
                {item.date && (
                  <span className="text-[11px] text-muted shrink-0">
                    {item.date}
                  </span>
                )}
              </div>

              {item.description && (
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
