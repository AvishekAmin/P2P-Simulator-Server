import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No records found",
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-border bg-white shadow-xs",
        className
      )}
    >
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="border-b border-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                className={cn("px-4 py-3", col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-muted"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-xs text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const key = keyExtractor(row);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors hover:bg-slate-50/60",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, colIndex) => {
                    const value = col.accessorKey
                      ? (row[col.accessorKey] as ReactNode)
                      : null;
                    return (
                      <td
                        key={colIndex}
                        className={cn("px-4 py-3 text-slate-700", col.className)}
                      >
                        {col.cell ? col.cell(row) : value}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
