import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  label?: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "All",
  className,
}: FilterDropdownProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      {label && (
        <span className="mr-2 text-xs font-medium text-muted shrink-0">
          {label}:
        </span>
      )}
      <div className="relative w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-md border border-border bg-white pl-3 pr-8 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition-colors cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
      </div>
    </div>
  );
}
