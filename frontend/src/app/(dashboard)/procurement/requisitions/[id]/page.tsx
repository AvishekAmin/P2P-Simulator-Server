"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Bot,
  User,
  Building2,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  RotateCw,
  Send,
  Loader2,
  Lock,
  RefreshCw,
  XCircle,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  Timeline,
  MoneyDisplay,
  LoadingState,
  ErrorState,
  DataTable,
  type Column,
  type TimelineItem,
} from "@/components/ui";
import { useRequisitionPolling } from "@/hooks/useRequisitionPolling";
import type {
  DraftRequirements,
  SourcingCandidateView,
} from "@/types/requisition";
import type { PurchaseOrderItem } from "@/types/purchase-order";

export default function RequisitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const {
    requisition,
    isLoading,
    error,
    pollingState,
    isPolling,
    pollAttempt,
    isSubmitting,
    submitError,
    refresh,
    sendMessage,
  } = useRequisitionPolling(id);

  const [messageInput, setMessageInput] = useState("");
  const [showScoringModel, setShowScoringModel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom of message transcript when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [requisition?.messages]);

  // Submit clarification message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || isSubmitting || !id) return;

    const trimmedInput = messageInput.trim();
    const result = await sendMessage(trimmedInput);
    if (result) {
      setMessageInput("");
    }
  };

  // Is the conversation open for clarification input?
  const isClarificationOpen = requisition?.status === "NEEDS_CLARIFICATION";
  const isClosedStatus =
    requisition?.status &&
    [
      "REQUIREMENTS_EXTRACTED",
      "SUPPLIER_SELECTED",
      "PO_CREATED",
      "FAILED",
    ].includes(requisition.status);

  // Build Procurement Lifecycle Timeline based on actual backend status
  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!requisition) return [];

    const status = requisition.status;
    const isFailed = status === "FAILED";

    return [
      {
        title: "Intake Created",
        description: "Requisition submitted via natural language.",
        status: "completed",
        date: requisition.createdAt
          ? new Date(requisition.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : undefined,
      },
      {
        title: "Requirement Extraction",
        description:
          status === "NEEDS_CLARIFICATION"
            ? "Awaiting user clarification for missing requirements."
            : status === "PROCESSING"
            ? "AI model is analyzing requirement specifications."
            : "All 5 required procurement fields extracted and validated.",
        status:
          status === "NEEDS_CLARIFICATION"
            ? "current"
            : status === "PROCESSING"
            ? "current"
            : [
                "REQUIREMENTS_EXTRACTED",
                "SUPPLIER_SELECTED",
                "PO_CREATED",
              ].includes(status) || (isFailed && requisition.requirement)
            ? "completed"
            : isFailed
            ? "error"
            : "upcoming",
      },
      {
        title: "Supplier Sourcing",
        description:
          status === "SUPPLIER_SELECTED" || status === "PO_CREATED"
            ? `Best supplier selected: ${requisition.sourcing?.selectedSupplier?.name || "Ranked candidate"}`
            : isFailed && !requisition.sourcing
            ? requisition.failureReason || "No eligible supplier found in catalog."
            : status === "REQUIREMENTS_EXTRACTED"
            ? "Autonomous supplier matching & score ranking in progress."
            : "Awaiting extracted requirements.",
        status:
          ["SUPPLIER_SELECTED", "PO_CREATED"].includes(status)
            ? "completed"
            : status === "REQUIREMENTS_EXTRACTED"
            ? "current"
            : isFailed && !requisition.sourcing && requisition.requirement
            ? "error"
            : "upcoming",
      },
      {
        title: "Purchase Order",
        description: requisition.purchaseOrder
          ? `PO ${requisition.purchaseOrder.poNumber} (${requisition.purchaseOrder.status})`
          : isFailed && requisition.sourcing
          ? requisition.failureReason || "PO generation failed."
          : "Generated automatically upon supplier selection.",
        status: requisition.purchaseOrder
          ? "completed"
          : isFailed && requisition.sourcing
          ? "error"
          : "upcoming",
      },
    ];
  }, [requisition]);

  // Candidates table columns (Phase 3E)
  const candidateColumns: Column<SourcingCandidateView>[] = useMemo(() => {
    const winnerId = requisition?.sourcing?.selectedSupplier?.id;

    return [
      {
        header: "Rank",
        accessorKey: "rank",
        className: "w-20 font-semibold text-slate-700",
        cell: (row) => {
          const isWinner = row.eligible && (row.supplierId === winnerId || row.rank === 1);
          return (
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-2 py-0.5 ${
                  isWinner
                    ? "bg-amber-500 text-white shadow-2xs"
                    : row.eligible
                    ? "bg-slate-100 text-slate-800 border border-slate-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                #{row.rank}
              </span>
              {isWinner && <Award className="h-4 w-4 text-amber-500 shrink-0" />}
            </div>
          );
        },
      },
      {
        header: "Supplier",
        accessorKey: "supplierName",
        className: "min-w-[200px] font-medium text-foreground",
        cell: (row) => {
          const isWinner = row.eligible && (row.supplierId === winnerId || row.rank === 1);
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                <Building2 className="h-3.5 w-3.5 text-muted shrink-0" />
                <span>{row.supplierName}</span>
                {isWinner && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-300">
                    Selected
                  </span>
                )}
              </div>
              {!row.eligible && row.ineligibleReason && (
                <div className="flex items-start gap-1 text-[11px] text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-200/80">
                  <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{row.ineligibleReason}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        header: "Eligibility",
        accessorKey: "eligible",
        className: "w-24",
        cell: (row) => (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
              row.eligible
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {row.eligible ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Eligible
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 text-rose-600" />
                Ineligible
              </>
            )}
          </span>
        ),
      },
      {
        header: "Unit Price",
        accessorKey: "unitPricePaise",
        className: "w-28",
        cell: (row) => (
          <MoneyDisplay
            amountPaise={row.unitPricePaise}
            className="text-xs font-semibold text-slate-800"
          />
        ),
      },
      {
        header: "Delivery",
        accessorKey: "deliveryDays",
        className: "w-24 text-xs text-slate-600",
        cell: (row) => `${row.deliveryDays} days`,
      },
      {
        header: "Available Stock",
        accessorKey: "availableStock",
        className: "w-28 text-xs text-slate-600",
        cell: (row) => `${row.availableStock.toLocaleString()} units`,
      },
      {
        header: "Factor Score Breakdown",
        accessorKey: "scores",
        className: "min-w-[220px]",
        cell: (row) => {
          if (!row.eligible) {
            return (
              <span className="text-[11px] text-slate-400 italic">
                Disqualified (Scores: 0)
              </span>
            );
          }
          const s = row.scores;
          return (
            <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-mono">
              <div className="rounded bg-slate-50 border border-slate-200 px-1 py-0.5" title="Price Score (30% weight)">
                <span className="text-muted block text-[8px] uppercase">Price</span>
                <span className="font-bold text-slate-700">{s?.price?.toFixed(0) || 0}</span>
              </div>
              <div className="rounded bg-slate-50 border border-slate-200 px-1 py-0.5" title="Delivery Score (25% weight)">
                <span className="text-muted block text-[8px] uppercase">Deliv</span>
                <span className="font-bold text-slate-700">{s?.delivery?.toFixed(0) || 0}</span>
              </div>
              <div className="rounded bg-slate-50 border border-slate-200 px-1 py-0.5" title="Reliability Score (20% weight)">
                <span className="text-muted block text-[8px] uppercase">Rel</span>
                <span className="font-bold text-slate-700">{s?.reliability?.toFixed(0) || 0}</span>
              </div>
              <div className="rounded bg-slate-50 border border-slate-200 px-1 py-0.5" title="Rating Score (15% weight)">
                <span className="text-muted block text-[8px] uppercase">Rate</span>
                <span className="font-bold text-slate-700">{s?.rating?.toFixed(0) || 0}</span>
              </div>
              <div className="rounded bg-slate-50 border border-slate-200 px-1 py-0.5" title="Stock Score (10% weight)">
                <span className="text-muted block text-[8px] uppercase">Stk</span>
                <span className="font-bold text-slate-700">{s?.stock?.toFixed(0) || 0}</span>
              </div>
            </div>
          );
        },
      },
      {
        header: "Total Score",
        accessorKey: "scores",
        className: "w-24 text-right",
        headerClassName: "text-right",
        cell: (row) => (
          <div className="text-right">
            <span
              className={`text-xs font-bold ${
                row.eligible ? "text-primary text-sm" : "text-slate-400"
              }`}
            >
              {row.eligible ? `${row.scores?.total?.toFixed(1) || 0}` : "—"}
            </span>
            {row.eligible && (
              <span className="text-[10px] text-muted block">/ 100</span>
            )}
          </div>
        ),
      },
    ];
  }, [requisition?.sourcing?.selectedSupplier?.id]);

  // PO Item table columns
  const poItemColumns: Column<PurchaseOrderItem>[] = [
    {
      header: "Description",
      accessorKey: "description",
      className: "text-xs font-medium text-slate-800",
    },
    {
      header: "Quantity",
      accessorKey: "quantity",
      className: "text-xs text-slate-600",
      cell: (row) => `${row.quantity} units`,
    },
    {
      header: "Unit Price",
      accessorKey: "unitPricePaise",
      cell: (row) => (
        <MoneyDisplay
          amountPaise={row.unitPricePaise}
          className="text-xs text-slate-700"
        />
      ),
    },
    {
      header: "Line Total",
      accessorKey: "lineTotalPaise",
      className: "text-right font-medium text-slate-900",
      headerClassName: "text-right",
      cell: (row) => (
        <MoneyDisplay
          amountPaise={row.lineTotalPaise}
          className="text-xs font-bold text-slate-900"
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/procurement/requisitions")}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Requisitions
          </button>
        </div>
        <div className="rounded-lg border border-border bg-white p-12">
          <LoadingState message="Connecting to backend and fetching requisition details..." />
        </div>
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/procurement/requisitions"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Requisitions
          </Link>
        </div>
        <ErrorState
          title={error?.toLowerCase().includes("not found") ? "Requisition Not Found" : "Unable to Load Requisition"}
          message={
            error ||
            "The requested requisition could not be found or does not belong to this organization."
          }
          onRetry={refresh}
        />
      </div>
    );
  }

  const draft = (requisition.draftRequirements || {}) as DraftRequirements;
  const requirement = requisition.requirement;
  const candidates = (requisition.supplierCandidates || []) as SourcingCandidateView[];
  const sourcing = requisition.sourcing;
  const purchaseOrder = requisition.purchaseOrder;
  const isSourcingFailed = requisition.status === "FAILED" && !sourcing;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/procurement/requisitions"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Requisitions List
        </Link>

        <div className="flex items-center gap-2">
          {isPolling && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-xs text-primary font-medium animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>
                {pollingState === "PROCESSING_EXTRACTION"
                  ? "Extracting requirements live..."
                  : pollingState === "SOURCING"
                  ? "Sourcing suppliers live..."
                  : "Checking updates..."}
              </span>
              <span className="text-[10px] text-blue-600/80">({pollAttempt}s)</span>
            </div>
          )}

          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isPolling ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Dynamic Processing & Asynchronous Status Banners */}
      {pollingState === "PROCESSING_EXTRACTION" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/90 p-4 text-blue-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-primary shrink-0 animate-spin mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Requirement Extraction In Progress
              </h4>
              <p className="text-xs leading-relaxed text-blue-800">
                The procurement assistant is actively analyzing your request and validating the required procurement parameters against catalog rules. Checking for updates every second...
              </p>
            </div>
          </div>
        </div>
      )}

      {pollingState === "SOURCING" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 animate-pulse mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Supplier Sourcing &amp; Ranking In Progress
              </h4>
              <p className="text-xs leading-relaxed text-amber-800">
                Requirements have been verified. Autonomous supplier discovery is currently evaluating catalog offers, checking stock, and generating the optimal sourcing decision...
              </p>
            </div>
          </div>
        </div>
      )}

      {pollingState === "TIMEOUT" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Processing Taking Longer Than Expected
                </h4>
                <p className="text-xs leading-relaxed text-amber-800">
                  The background workers are still executing your procurement workflow. Click Refresh to poll the latest state.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors shrink-0 shadow-2xs"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Status
            </button>
          </div>
        </div>
      )}

      {pollingState === "ERROR" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Status Sync Interrupted
                </h4>
                <p className="text-xs leading-relaxed text-rose-700">
                  Unable to check the latest background update due to a network blip. Your requisition data is preserved below.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 transition-colors shrink-0 shadow-2xs"
            >
              <RefreshCw className="h-3 w-3" />
              Retry Sync
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={`Requisition ${requisition.id.slice(0, 18)}...`}
        description={`Organization: ${requisition.organizationId} • Created on ${new Date(
          requisition.createdAt
        ).toLocaleString("en-IN")}`}
        actions={<StatusBadge status={requisition.status} />}
      />

      {/* Failure Alert Banner if FAILED */}
      {requisition.status === "FAILED" && requisition.failureReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Procurement Workflow Interrupted
              </h4>
              <p className="text-xs leading-relaxed text-rose-700 font-mono">
                {requisition.failureReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Original Request Section */}
      <div className="rounded-lg border border-border bg-white p-5 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
          <FileText className="h-4 w-4 text-primary" />
          <span>Original User Intake Request</span>
        </div>
        <div className="rounded-md bg-slate-50 border border-slate-200/80 p-3.5 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
          &quot;{requisition.rawInput}&quot;
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Formal Data */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section: Extracted Requirements or Draft State */}
          <div className="rounded-lg border border-border bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package className="h-4 w-4 text-primary" />
                <span>
                  {requirement ? "Extracted Requirements" : "Draft Requirements State"}
                </span>
              </div>
              {requirement ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <Clock className="h-3 w-3" />
                  {requisition.status === "NEEDS_CLARIFICATION" ? "Clarification Required" : "Processing"}
                </span>
              )}
            </div>

            {requirement ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 rounded border border-slate-100 bg-slate-50/50 p-3">
                  <span className="text-muted block text-[11px]">Product / Item</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {requirement.productName}
                  </span>
                  {requirement.category && (
                    <span className="text-[11px] text-muted block">
                      Category: {requirement.category}
                    </span>
                  )}
                </div>

                <div className="space-y-1 rounded border border-slate-100 bg-slate-50/50 p-3">
                  <span className="text-muted block text-[11px]">Required Quantity</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {requirement.quantity.toLocaleString()} units
                  </span>
                </div>

                <div className="space-y-1 rounded border border-slate-100 bg-slate-50/50 p-3">
                  <span className="text-muted block text-[11px]">Max Budget Ceiling</span>
                  {requirement.maxUnitPricePaise ? (
                    <div className="flex items-baseline gap-1">
                      <MoneyDisplay
                        amountPaise={requirement.maxUnitPricePaise}
                        currency={requirement.currency || "INR"}
                        className="font-bold text-slate-800 text-sm"
                      />
                      <span className="text-muted text-[11px]">/ unit</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Unconstrained</span>
                  )}
                </div>

                <div className="space-y-1 rounded border border-slate-100 bg-slate-50/50 p-3">
                  <span className="text-muted block text-[11px]">Delivery Deadline</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {requirement.deliveryDeadlineDays
                      ? `${requirement.deliveryDeadlineDays} calendar days`
                      : "Standard"}
                  </span>
                </div>

                {requirement.deliveryLocation && (
                  <div className="space-y-1 sm:col-span-2 rounded border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-muted block text-[11px]">Delivery Location</span>
                    <span className="font-medium text-slate-800">
                      {requirement.deliveryLocation}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5">
                    <span className="text-muted block text-[11px]">Product:</span>
                    <span className="font-medium text-slate-800">
                      {draft.productName || <span className="text-amber-600 italic">Pending</span>}
                    </span>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5">
                    <span className="text-muted block text-[11px]">Quantity:</span>
                    <span className="font-medium text-slate-800">
                      {draft.quantity ? `${draft.quantity} units` : <span className="text-amber-600 italic">Pending</span>}
                    </span>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5">
                    <span className="text-muted block text-[11px]">Budget Limit:</span>
                    {draft.maxUnitPricePaise ? (
                      <MoneyDisplay amountPaise={draft.maxUnitPricePaise} currency={draft.currency || "INR"} />
                    ) : (
                      <span className="text-amber-600 italic">Pending</span>
                    )}
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5">
                    <span className="text-muted block text-[11px]">Delivery Days:</span>
                    <span className="font-medium text-slate-800">
                      {draft.deliveryDays ? `${draft.deliveryDays} days` : <span className="text-amber-600 italic">Pending</span>}
                    </span>
                  </div>
                </div>

                {requisition.missingFields && requisition.missingFields.length > 0 && (
                  <div className="rounded bg-amber-50 border border-amber-200 p-3 text-amber-900">
                    <span className="font-semibold block text-[11px]">Missing Required Fields:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {requisition.missingFields.map((field) => (
                        <span
                          key={field}
                          className="inline-flex rounded bg-white px-2 py-0.5 font-mono text-[11px] border border-amber-300 text-amber-800"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Supplier Discovery & Sourcing Decision (Phase 3E) */}
          {(sourcing || candidates.length > 0 || isSourcingFailed) && (
            <div className="rounded-lg border border-border bg-white p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Supplier Discovery &amp; Sourcing Outcome</span>
                </div>
                {sourcing && (
                  <span className="text-xs text-muted">
                    Evaluated {sourcing.candidatesEvaluated} suppliers
                  </span>
                )}
              </div>

              {/* 3E-A: Winning Sourcing Outcome Card */}
              {sourcing && (
                <div className="rounded-lg border border-amber-200 bg-linear-to-br from-amber-50/80 to-amber-100/30 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-amber-200/70 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                          Selected by Autonomous Workflow
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 pt-0.5">
                        <Building2 className="h-4 w-4 text-amber-600" />
                        <span>{sourcing.selectedSupplier?.name || "Awarded Supplier"}</span>
                      </h3>
                      {sourcing.decidedAt && (
                        <p className="text-[11px] text-muted">
                          Decision finalized on{" "}
                          {new Date(sourcing.decidedAt).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-white/90 border border-amber-200/90 rounded-md px-3 py-2 shadow-2xs">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-muted block">
                          Composite Score
                        </span>
                        <span className="text-base font-bold text-amber-600">
                          {sourcing.totalScore?.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted ml-0.5">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {sourcing.rationale && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-amber-900 block uppercase tracking-wider">
                        AI Sourcing Rationale:
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed italic bg-white/80 p-3 rounded border border-amber-200/70 shadow-2xs">
                        &quot;{sourcing.rationale}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3E-D: Failed Sourcing / No Supplier Found Card */}
              {isSourcingFailed && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-4 space-y-2 text-rose-900">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                        No Eligible Supplier Found
                      </h4>
                      <p className="text-xs text-rose-700 leading-relaxed">
                        {requisition.failureReason ||
                          "None of the evaluated catalog suppliers satisfied all hard constraints (currency, price ceiling, minimum stock, or delivery deadline)."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3E-B: Evaluated Supplier Candidates Comparison Table */}
              {candidates.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 block">
                      Evaluated Supplier Catalog Offers ({candidates.length})
                    </span>
                    <span className="text-[11px] text-muted">
                      Ranked deterministically by 5-factor scoring model
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <DataTable
                      columns={candidateColumns}
                      data={candidates}
                      keyExtractor={(row) => row.supplierId}
                    />
                  </div>
                </div>
              )}

              {/* 3E-C: Deterministic 5-Factor Scoring Model Explanation Accordion */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowScoringModel((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3 text-left font-medium text-slate-700 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    <span>How Supplier Sourcing &amp; Scoring Works (Backend Logic)</span>
                  </div>
                  {showScoringModel ? (
                    <ChevronUp className="h-4 w-4 text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted" />
                  )}
                </button>

                {showScoringModel && (
                  <div className="p-3.5 pt-0 border-t border-slate-200/80 space-y-3 text-slate-600 leading-relaxed text-[11px]">
                    <p>
                      Supplier selection is computed <strong>deterministically</strong> on the backend according to the PR2 sourcing rules:
                    </p>

                    <div className="space-y-1.5 pl-2 border-l-2 border-primary/40">
                      <div>
                        <strong>1. Hard Eligibility Gating:</strong> Suppliers must be active, quote in the required currency, meet minimum order requirements, hold sufficient stock, not exceed max unit price, and meet delivery deadlines. Disqualified offers score 0.
                      </div>
                      <div>
                        <strong>2. 5-Factor Weighted Score (Eligible Set Only):</strong>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-700">
                          <li><strong>Price (30% weight):</strong> Min-max normalized against competing offers (cheapest = 100).</li>
                          <li><strong>Delivery Speed (25% weight):</strong> Min-max normalized against competing offers (fastest = 100).</li>
                          <li><strong>Supplier Reliability (20% weight):</strong> Normalized historical fulfillment and on-time score (0–100).</li>
                          <li><strong>Catalog Rating (15% weight):</strong> 5-star quality rating scaled to 100 points.</li>
                          <li><strong>Available Stock (10% weight):</strong> Stock depth normalized across eligible offers.</li>
                        </ul>
                      </div>
                      <div>
                        <strong>3. AI Rationale:</strong> Once the winning supplier is selected deterministically by composite score, an AI provider writes an explanatory narrative for transparency.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Purchase Order Details */}
          {purchaseOrder && (
            <div className="rounded-lg border border-border bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span>Purchase Order Summary</span>
                </div>
                <StatusBadge status={purchaseOrder.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5">
                  <span className="text-muted block text-[11px]">PO Number:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {purchaseOrder.poNumber}
                  </span>
                </div>
                <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5">
                  <span className="text-muted block text-[11px]">Supplier:</span>
                  <span className="font-semibold text-slate-800">
                    {purchaseOrder.supplier?.name || "Awarded Supplier"}
                  </span>
                </div>
                <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5">
                  <span className="text-muted block text-[11px]">Total Value:</span>
                  <MoneyDisplay
                    amountPaise={purchaseOrder.totalPaise}
                    currency={purchaseOrder.currency || "INR"}
                    className="font-bold text-slate-900 text-sm"
                  />
                </div>
              </div>

              {purchaseOrder.items && purchaseOrder.items.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-slate-700 block">
                    PO Line Items
                  </span>
                  <DataTable
                    columns={poItemColumns}
                    data={purchaseOrder.items}
                    keyExtractor={(row) => row.id}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Timeline & Interactive Conversation Transcript */}
        <div className="space-y-6">
          {/* Timeline Card */}
          <div className="rounded-lg border border-border bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              <span>Procurement Lifecycle</span>
            </div>
            <Timeline items={timelineItems} />
          </div>

          {/* Conversational Clarification & History Card */}
          <div className="rounded-lg border border-border bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span>Conversational Clarification</span>
              </div>
              <span className="text-xs text-muted">
                {requisition.messages?.length || 1} {requisition.messages?.length === 1 ? "turn" : "turns"}
              </span>
            </div>

            {/* Clarification Alert Context if NEEDS_CLARIFICATION */}
            {isClarificationOpen && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-amber-900">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Clarification Required</span>
                    <p className="text-slate-700 mt-0.5">
                      {requisition.clarificationMessage ||
                        "Please provide the missing requirement details below to proceed with automated supplier sourcing."}
                    </p>
                  </div>
                </div>

                {requisition.missingFields && requisition.missingFields.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-medium text-amber-800">Needed:</span>
                    {requisition.missingFields.map((f) => (
                      <span
                        key={f}
                        className="inline-flex rounded bg-white px-1.5 py-0.5 text-[10px] font-mono border border-amber-300 text-amber-900 font-semibold"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation Messages Transcript */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {requisition.messages && requisition.messages.length > 0 ? (
                requisition.messages.map((msg) => {
                  const isUser = msg.role === "USER";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isUser
                            ? "bg-slate-800 text-white"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      </div>

                      <div
                        className={`rounded-lg p-3 text-xs leading-relaxed max-w-[85%] ${
                          isUser
                            ? "bg-slate-100 text-slate-900 rounded-tr-none"
                            : "bg-blue-50 border border-blue-100 text-slate-800 rounded-tl-none"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-[10px] uppercase text-muted">
                            {isUser ? "Requester" : "Procurement AI"}
                          </span>
                          <span className="text-[10px] text-muted">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-muted">
                  No conversation transcript available.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Active Composer for NEEDS_CLARIFICATION */}
            {isClarificationOpen && (
              <form onSubmit={handleSendMessage} className="pt-2 border-t border-border space-y-2">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isSubmitting}
                    placeholder="Type clarification or corrections (e.g., '100 units under ₹1,800 within 5 days')..."
                    className="w-full resize-none rounded-md border border-border bg-white p-2.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>

                {submitError && (
                  <p className="text-[11px] text-rose-600 font-medium">{submitError}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted">
                    Press Enter to send, Shift+Enter for new line
                  </span>

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Processing Banner if in processing / sourcing state */}
            {(pollingState === "PROCESSING_EXTRACTION" || pollingState === "SOURCING") && (
              <div className="rounded-md border border-blue-200 bg-blue-50/70 p-3 flex items-center gap-2 text-xs text-blue-900">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <span className="font-medium">
                  {pollingState === "PROCESSING_EXTRACTION"
                    ? "Procurement AI is analyzing requirements and updating draft state..."
                    : "Requirements extracted. Running autonomous supplier matching..."}
                </span>
              </div>
            )}

            {/* Closed State Banner for Finalized or Failed Requisitions */}
            {isClosedStatus && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 flex items-center gap-2 text-xs text-slate-600">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  {requisition.status === "FAILED"
                    ? "Requisition workflow is finished. No further messages can be submitted."
                    : "Requirements finalized. Conversation is closed for this requisition."}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
