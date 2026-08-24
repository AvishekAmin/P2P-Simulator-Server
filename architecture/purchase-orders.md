# Purchase Order Generation and Approval

The stage between supplier selection and the goods receipt: a background worker turns a
`SourcingDecision` into a priced `PurchaseOrder`, and a human approves or rejects it.

See `architecture/supplier-discovery.md` for the stage that feeds this one, and
`api-docs/purchase-orders-api.md` for the client contract.

## Flow

```text
supplier-discovery worker
    └─ applySourcingSuccess() commits, then enqueuePurchaseOrder({ requisitionId, organizationId })
            │
            ▼
purchase-order queue ── create-purchase-order
            │
            ▼
src/workers/purchaseOrder.worker.ts
    load requisition (tenant-scoped)          → already has a PO?  skip
    requirement + sourcing decision           → missing?  invariant breach → retry → SYSTEM_FAILURE
    load the live SupplierProduct             → gone?     NO_SUPPLIER_FOUND, requisition FAILED
    re-check eligibility against the live row → stale?    NO_SUPPLIER_FOUND, requisition FAILED
                                                          (refused if the requisition moved on)
    calculatePurchaseOrderTotals()            → subtotal, 18% tax, total (integer paise)
    decideApprovalStatus()                    → PENDING_APPROVAL
    applyPurchaseOrderCreation()              → one transaction
            │
            ▼
        (stop — approval is a human action, nothing is enqueued)
```

## Money

`src/rules/approvalRules.ts` is pure and has no I/O. It is the only place purchase-order money is
computed:

```text
lineTotalPaise = quantity × unitPricePaise
subtotalPaise  = Σ lineTotalPaise
taxPaise       = round(subtotalPaise × DEFAULT_TAX_RATE_BPS / 10 000)   // 1800 bps = 18% GST
totalPaise     = subtotalPaise + taxPaise
```

Every value is an integer number of paise. Tax is rounded exactly once, on the subtotal, because
the PO total is what the supplier's invoice is matched against in Phase 9. Gemini is not involved
at any point in this stage — it is never called by this worker.

## Prices come from the live listing, not the snapshot

Sourcing may have run minutes ago. The worker re-reads the chosen `SupplierProduct` and re-runs
`checkEligibility()` (`src/rules/supplierRanking.ts` — the same function sourcing used) against the
requirement before pricing anything. If the price has risen above the ceiling, stock has dropped
below the ordered quantity, or the lead time now misses the deadline, no purchase order is created:
the requisition goes to `FAILED` with a `NO_SUPPLIER_FOUND` exception describing what changed. A
purchase order is never issued on terms nobody approved.

## Approval policy

`decideApprovalStatus()` returns `PENDING_APPROVAL` for every purchase order while
`PO_AUTO_APPROVE_ENABLED` is `false` (`src/config/constants.ts`) — the MVP demo routes everything
through a human. The threshold branch against `APPROVAL_THRESHOLDS_PAISE.AUTO_APPROVE_BELOW` is
already written behind that flag, so enabling auto-approval is a one-constant change.

That flag is genuinely one constant: when creation produces an `APPROVED` purchase order it also
stamps `approvedAt`, creates the shipment and writes the `PO_APPROVED` / `SHIPMENT_CREATED` audits
inside the same transaction. It cannot defer to `approvePurchaseOrder`, which early-returns for an
already-approved PO and would therefore never create the shipment.

Each `PENDING_APPROVAL` purchase order opens a `PO_APPROVAL_REQUIRED` exception, upserted on
`[organizationId, type, entityId]` so a redriven job cannot open it twice. Approval and rejection
both close it (`resolveException`) and audit `EXCEPTION_RESOLVED` — but only when a row actually
moved, so a repeated call appends no second resolution.

## State machine

```text
                    ┌── approve ──▶ APPROVED ──▶ (Phase 7: SHIPPED → RECEIVED → COMPLETED)
PENDING_APPROVAL ───┤
                    └── reject  ──▶ REJECTED
```

`REJECTED → APPROVED` and `APPROVED → REJECTED` both fail with `INVALID_STATE` (409). `DRAFT` is
never produced by this worker. There is deliberately no generic status-mutation endpoint.

Requisition side: `PO_CREATED` on generation, unchanged by approval (the PO status carries that),
and `FAILED` + `failureReason` on rejection — `RequisitionStatus` has no approved/rejected member,
and the frontend should never have to infer workflow state from unrelated fields.

## Idempotency

Every BullMQ job can run more than once, and a client can double-click Approve.

| Risk | Guard |
| --- | --- |
| Two purchase orders for one requisition | `@@unique` on `PurchaseOrder.requisitionId`, plus a guarded `updateMany` claiming `SUPPLIER_SELECTED → PO_CREATED`; the loser writes nothing and the worker reports `skipped` |
| A retry racing the PO number | `poNumber = PO-<YYYYMMDD>-<last 6 of requisitionId>` — derived from a unique id, so a retry regenerates the identical value instead of racing `@@unique([organizationId, poNumber])` |
| Two shipments for one approval | `shipment.upsert` on the unique `purchaseOrderId` with an **empty** `update`, so an existing shipment is reused and a `DELIVERED` one is never dragged back to `IN_TRANSIT` |
| Duplicate audit rows | Audits are written only on the branch that actually transitioned; a repeat approve/reject returns early |
| Duplicate approval exceptions | `recordException` upserts on `[organizationId, type, entityId]` |
| A redriven job failing a requisition that already has a PO | `applyPurchaseOrderFailure` claims `SUPPLIER_SELECTED → FAILED` with a guarded `updateMany` and returns `false` when it misses; the loser writes no exception and no audit, and reports the winner's outcome instead |
| Money overflowing the 32-bit paise columns | `calculatePurchaseOrderTotals` rejects any line total, subtotal or total above `MAX_MONEY_PAISE`; the worker treats that validation error as terminal rather than retrying it three times |

## Transactions

Three write paths, each a single `prisma.$transaction`:

- **Creation** — requisition claim + PO + items (nested create) + `PO_CREATED` audit + approval
  exception + `EXCEPTION_CREATED` audit.
- **Approval** — guarded PO transition + shipment upsert + `PO_APPROVED` and `SHIPMENT_CREATED`
  audits + the approval exception resolved.
- **Rejection** — guarded PO transition + requisition `FAILED` + `PO_REJECTED` audit + the approval
  exception resolved.

A database failure anywhere rolls the whole thing back, so a requisition can never claim a purchase
order is approved when the approval transaction failed.

A rejection is audited as `PO_REJECTED` — an `AuditAction` member added for this stage — with the
actor set to the rejecting user and `metadata: { reason }`.

## Tenancy

Every load is `findFirst` scoped by `organizationId`; a purchase order belonging to another
organization is a **404**, never a 403 — a 403 would confirm the id exists. `SupplierProduct` has no
`organizationId` of its own, so it is scoped through `supplier: { organizationId }`.
