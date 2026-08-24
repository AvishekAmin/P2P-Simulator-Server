"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  PlusCircle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  SearchInput,
  FilterDropdown,
  LoadingState,
  ErrorState,
  EmptyState,
  type Column,
} from "@/components/ui";
import { requisitionService } from "@/services/requisition.service";
import type { RequisitionListItem } from "@/types/requisition";
import type { RequisitionStatus } from "@/types/enums";

const STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Needs Clarification", value: "NEEDS_CLARIFICATION" },
  { label: "Requirements Extracted", value: "REQUIREMENTS_EXTRACTED" },
  { label: "Supplier Selected", value: "SUPPLIER_SELECTED" },
  { label: "PO Created", value: "PO_CREATED" },
  { label: "Failed", value: "FAILED" },
];

export default function RequisitionsListPage() {
  const [requisitions, setRequisitions] = useState<RequisitionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Cursor-based Pagination State
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Fetch effect with cancellation
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const response = await requisitionService.list({
          status: statusFilter ? (statusFilter as RequisitionStatus) : undefined,
          limit: 15,
          cursor: currentCursor,
        });

        if (!isCancelled) {
          setRequisitions(response.items);
          setNextCursor(response.nextCursor);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load requisitions from server"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [currentCursor, statusFilter, reloadTrigger]);

  // Handle status filter change
  const handleStatusChange = (newStatus: string) => {
    setIsLoading(true);
    setStatusFilter(newStatus);
    setCurrentCursor(undefined);
    setCursorHistory([]);
  };

  // Handle next page
  const handleNextPage = () => {
    if (!nextCursor) return;
    setIsLoading(true);
    setCursorHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(nextCursor);
  };

  // Handle previous page
  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;
    setIsLoading(true);
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    setCurrentCursor(prevCursor);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  // Client-side search across the currently loaded page records
  const filteredRequisitions = useMemo(() => {
    if (!searchQuery.trim()) return requisitions;
    const q = searchQuery.toLowerCase().trim();
    return requisitions.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.rawInput.toLowerCase().includes(q) ||
        item.clarificationMessage?.toLowerCase().includes(q)
    );
  }, [requisitions, searchQuery]);

  const columns: Column<RequisitionListItem>[] = [
    {
      header: "Requisition ID",
      accessorKey: "id",
      className: "font-mono text-xs font-semibold text-primary min-w-[140px]",
      cell: (row) => (
        <Link
          href={`/procurement/requisitions/${row.id}`}
          className="hover:underline flex items-center gap-1.5"
        >
          <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
          <span>{row.id.slice(0, 16)}...</span>
        </Link>
      ),
    },
    {
      header: "Requirement Summary",
      accessorKey: "rawInput",
      className: "max-w-md",
      cell: (row) => (
        <div className="space-y-1">
          <p className="line-clamp-2 text-xs font-medium text-slate-800">
            {row.rawInput}
          </p>
          {row.turnCount > 1 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <MessageSquare className="h-3 w-3" />
              {row.turnCount} conversation {row.turnCount === 1 ? "turn" : "turns"}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Clarification / Notes",
      cell: (row) => {
        if (row.status === "NEEDS_CLARIFICATION") {
          return (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/80 px-2 py-1 rounded border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[200px]">
                {row.missingFields?.length > 0
                  ? `Missing: ${row.missingFields.join(", ")}`
                  : "Clarification needed"}
              </span>
            </div>
          );
        }
        if (row.status === "FAILED") {
          return (
            <span className="text-xs text-rose-600 truncate max-w-[220px] block">
              Workflow stopped
            </span>
          );
        }
        return (
          <span className="text-xs text-muted">
            {row.status === "REQUIREMENTS_EXTRACTED"
              ? "Sourcing in progress..."
              : row.status === "SUPPLIER_SELECTED"
              ? "Supplier selected"
              : row.status === "PO_CREATED"
              ? "PO generated"
              : "Standard"}
          </span>
        );
      },
    },
    {
      header: "Created Date",
      accessorKey: "createdAt",
      className: "text-xs text-muted whitespace-nowrap",
      cell: (row) => {
        const date = new Date(row.createdAt);
        return isNaN(date.getTime())
          ? row.createdAt
          : date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
      },
    },
    {
      header: "Action",
      className: "text-right whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) => (
        <Link
          href={`/procurement/requisitions/${row.id}`}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          View
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Procurement Requisitions"
        description="View and track natural-language procurement intakes and automated extraction lifecycles."
        actions={
          <button
            type="button"
            onClick={() => alert("Requisition creation modal will be linked in sub-phase workflow.")}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            New Requisition
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3.5 rounded-lg border border-border shadow-xs">
        <div className="w-full sm:w-72">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search loaded requisitions..."
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <FilterDropdown
            label="Filter by Status"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={handleStatusChange}
            placeholder="All Statuses"
            className="w-full sm:w-56"
          />
        </div>
      </div>

      {/* Data Section */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-white p-8">
          <LoadingState message="Connecting to backend and loading requisitions..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to Load Requisitions"
          message={error}
          onRetry={handleRetry}
        />
      ) : filteredRequisitions.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No matching requisitions found" : "No requisitions found"}
          description={
            searchQuery
              ? `No loaded requisition matched your filter "${searchQuery}".`
              : statusFilter
              ? `No requisitions found with status "${statusFilter}".`
              : "No procurement requisitions have been created in this organization yet."
          }
          icon={FileText}
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={filteredRequisitions}
            keyExtractor={(row) => row.id}
          />

          {/* Cursor Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs text-muted">
            <div>
              Showing <span className="font-semibold text-foreground">{filteredRequisitions.length}</span>{" "}
              {filteredRequisitions.length === 1 ? "requisition" : "requisitions"}
              {searchQuery && " (filtered locally)"}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={cursorHistory.length === 0 || isLoading}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={!nextCursor || isLoading}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
              >
                Next Page
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
