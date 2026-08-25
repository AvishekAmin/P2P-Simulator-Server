# Three-Way Matching, Payment, and Exceptions

The stage between invoice extraction and settlement: an extracted invoice is checked against its
purchase order and goods receipt, a clean match is paid automatically by the simulated provider, and
a mismatch is parked as an `Exception` for a human to approve or reject.

See `architecture/invoices.md` for the stage that feeds this one, and `api-docs/invoices-api.md` /
`api-docs/exceptions-api.md` for the client contract.

## Flow

```text
Invoice EXTRACTED
        │
        ▼  queue: matching · job: run-three-way-match
src/workers/matching.worker.ts
    load invoice + PO + goods receipt (tenant-scoped, one query)
    already has a ThreeWayMatch?          → idempotent re-delivery, see Idempotency
    claim  EXTRACTED → MATCHING           (guarded)
    src/rules/threeWayMatch.ts · threeWayMatch()   — pure, deterministic, no Gemini
        │
        ▼  one transaction (src/services/matching.service.ts · applyMatchResult())
    ThreeWayMatch + 12 MatchChecks written (upsert — a re-match replaces, never duplicates)
        │
        ├─ MATCHED     → Invoice APPROVED
        │                       │
        │                       ▼  enqueued after the transaction commits
        │               queue: payment · job: process-payment
        │
        └─ MISMATCHED  → Invoice EXCEPTION, Payment row created BLOCKED
                          one Exception opened per distinct failing check-group
                          (no payment job queued)
        │
        ▼
src/workers/payment.worker.ts
    load invoice + match + payment + open exception count
    src/rules/paymentRules.ts · evaluatePayment()   — pure, deterministic
        │
        ├─ not payable  → return, no state change (see the payment gate below)
        │
        └─ payable      → claim Payment PENDING/BLOCKED/FAILED/PROCESSING → PROCESSING
                           src/payments/simulated.payment.ts · charge()   (outside any transaction)
                               │
                               ▼  one transaction
                           Payment COMPLETED, Invoice PAID
```

A human can also unblock a `MISMATCHED` invoice directly:

```text
POST /api/v1/exceptions/:id/resolve   { decision: "APPROVE" | "REJECT", reason }
        │
        ▼  src/services/exception.service.ts · resolveExceptionById()
    exception OPEN/UNDER_REVIEW → RESOLVED/REJECTED   (terminal once decided)
        │
        ├─ REJECT, or not the invoice's last open exception → nothing else happens
        │
        └─ APPROVE and no exceptions remain open on this invoice
                Invoice EXCEPTION → APPROVED
                Payment  BLOCKED  → PENDING
                        │
                        ▼  enqueued after the transaction commits
                queue: payment · job: process-payment
```

The API never runs matching or charges a payment inline — both are queued jobs, per CLAUDE.md §9.

## Three-way matching is pure TypeScript, not AI

`src/rules/threeWayMatch.ts` takes plain objects (a purchase order, an optional goods receipt, an
invoice, and the organization's prior invoices) and returns a verdict. No Prisma import, no I/O, no
Gemini call — CLAUDE.md §9: "Do not use AI here." The worker's only jobs are loading state, calling
this function, and persisting what it returned.

It runs all **twelve** `MatchCheckType` checks every time, in a fixed order, and reports the overall
match as `MATCHED` only if every one passes:

| Check | Compares | Notes |
| --- | --- | --- |
| `SUPPLIER` | PO supplier name vs. invoice's `supplierNameRaw` | punctuation/case-insensitive |
| `PO_NUMBER` | PO number vs. invoice's `poNumberRaw` | same normalization |
| `PRODUCT` | Every PO line invoiced, no invoice line off-catalog | invoice lines are matched back to PO lines by description via `findBestProduct()` — `InvoiceItem.productId` is never populated at extraction time |
| `ORDERED_QUANTITY` | PO quantity vs. the goods receipt's own record of what was ordered | a consistency check on the receipt, not a delivery check |
| `RECEIVED_QUANTITY` | PO quantity vs. `acceptedQuantity` (received − damaged) | fails outright if no goods receipt exists yet |
| `INVOICED_QUANTITY` | Accepted quantity vs. invoiced quantity | **the rule the engine exists for** — the demo mismatch (100 ordered, 98 received, 2 damaged, 100 invoiced) fails here against 96 accepted |
| `UNIT_PRICE` | PO unit price vs. each invoice line's unit price | per invoice line, not averaged — a supplier who splits a line and raises the price on half of it is still caught; 2% tolerance (shares `MATCH_TOLERANCES.PRICE_PERCENTAGE` with `SUBTOTAL`) |
| `SUBTOTAL` | PO subtotal vs. invoice subtotal | 2% tolerance |
| `TAX` | PO tax vs. invoice tax | 1% tolerance |
| `TOTAL` | PO total vs. invoice total | 1% tolerance |
| `CURRENCY` | PO currency vs. invoice currency | compared as codes, never converted |
| `DUPLICATE_INVOICE` | This invoice's number against every other invoice number this org has recorded | not a unique DB constraint — deliberately checked here so a duplicate is recorded and flagged, not silently rejected at upload |

Tolerances live in `src/config/constants.ts` (`MATCH_TOLERANCES`): quantity tolerance is `0` (exact),
price/tax/total tolerances are 1–2%. All arithmetic is on integer paise; `variance` is a reporting
ratio only, never a number that decides how much is owed.

A missing document field (`null`) is never treated as agreement — it fails the check as `"missing"`.
A `null` `goodsReceipt` fails `RECEIVED_QUANTITY` but not `ORDERED_QUANTITY` (that check has nothing
to be inconsistent about yet, so it reports `passed: true` to avoid raising two exceptions for the
same missing receipt).

## From failed checks to exceptions

`EXCEPTION_TYPE_BY_CHECK` in `src/rules/threeWayMatch.ts` maps most check types onto one
`ExceptionType`:

| Failing check(s) | `ExceptionType` |
| --- | --- |
| `SUPPLIER` | `SUPPLIER_MISMATCH` |
| `ORDERED_QUANTITY`, `RECEIVED_QUANTITY`, `INVOICED_QUANTITY` | `QUANTITY_MISMATCH` |
| `UNIT_PRICE`, `SUBTOTAL` | `PRICE_MISMATCH` |
| `TAX` | `TAX_MISMATCH` |
| `TOTAL`, `CURRENCY` | `TOTAL_MISMATCH` |
| `DUPLICATE_INVOICE` | `DUPLICATE_INVOICE` |
| `PO_NUMBER`, `PRODUCT` (unmapped) | `SYSTEM_FAILURE` |

`applyMatchResult()` groups the failed checks by that `ExceptionType` and opens **one** exception per
group, because `Exception` is unique on `[organizationId, type, entityId]` — three failing money
checks become one `PRICE_MISMATCH` exception carrying all three in `metadata.checks`, not three
upserts fighting over the same row. An invoice failing on both quantity and price gets two exceptions,
and both must be resolved before the invoice is released.

## The payment gate

`src/rules/paymentRules.ts` — `evaluatePayment()` — is the single deterministic function that decides
whether money may move. It is pure (no Prisma, no I/O) and unit-tested directly; the payment worker
does nothing but load state, ask it, and obey.

It checks, in order:

1. `invoiceStatus === PAID` → refuse, already paid.
2. `invoiceStatus !== APPROVED` → refuse (covers `EXTRACTED`, `MATCHING`, `EXCEPTION`, `FAILED`).
3. No `ThreeWayMatch` exists yet → refuse.
4. Any exception still `OPEN`/`UNDER_REVIEW` against this invoice → refuse — belt-and-braces; an
   `APPROVED` invoice should never have one, but if the two ever disagree, the open exception wins.
5. `paymentStatus === COMPLETED` → refuse, already settled.
6. Otherwise → payable.

**A `MISMATCHED` `ThreeWayMatch` does not by itself block payment forever, and it never gets rewritten.**
Re-matching a genuine discrepancy (98 received against 100 ordered) produces the same verdict every
time — a human cannot clear it by asking the system to check again. Instead they *override* it through
`POST /exceptions/:id/resolve`, which moves `Invoice EXCEPTION → APPROVED` and `Payment BLOCKED →
PENDING` once every exception on the invoice is closed. The `ThreeWayMatch` row keeps saying
`MISMATCHED` — that is what the paperwork says — and the authorization to pay anyway lives in the
resolved `Exception` (with its mandatory `resolutionReason`) and an `PAYMENT_APPROVED` audit row
instead. `isOverriddenPayment()` flags this on the completed payment's audit metadata
(`overriddenMatch: true`) so an overridden settlement is greppable later, not indistinguishable from
an ordinary clean payment.

## Payment is simulated, behind an interface

`src/payments/payment.interface.ts` defines `PaymentProvider` (`charge(input) → { providerReference }`),
so a real gateway can be dropped in later without touching the worker (CLAUDE.md §11). The only
implementation is `SimulatedPaymentProvider`: it always succeeds, and derives `providerReference` as
`SIM-<sha256(idempotencyKey:amountPaise:currency)>` — a retried charge produces the *same* reference
rather than a new one, so a duplicate delivery can never manufacture two different-looking payments
for one invoice.

The amount charged is always `purchaseOrder.totalPaise` — the buyer's own deterministically-calculated
commitment — never the AI-transcribed invoice total (CLAUDE.md §12). By the time payment runs,
matching has already proved the two agree within tolerance (or a human has explicitly overridden the
disagreement).

## Idempotency

Assume every job runs more than once.

| Guard | What it protects |
| --- | --- |
| Matching: existing `ThreeWayMatch` short-circuits the worker | A replayed job never re-runs the rule engine or reopens a decided verdict. If it finds a `MATCHED` invoice sitting `APPROVED` with no `Payment` row, it re-enqueues payment — healing the gap left by a Redis failure between the match transaction committing and the original enqueue call. |
| Matching: guarded `updateMany({ status: EXTRACTED\|MATCHING })` claim | Two workers cannot both match the same invoice; `MATCHING` is accepted so a job can resume its own interrupted attempt. |
| Matching: `threeWayMatch.upsert` on `invoiceId` (`@unique`) | A deliberate re-match (invoice pushed back to `EXTRACTED` after a resolution) replaces the old verdict instead of colliding. |
| Matching: `matchCheck.deleteMany` then `createMany` | `@@unique([threeWayMatchId, checkType])` would reject a retry that got partway through; replacing the set keeps the write repeatable. |
| Matching: `payment.upsert` on `invoiceId` (`@unique`) for the `BLOCKED` row | Recording the block is idempotent the same way. |
| Payment: `payment.create`, falling back to a guarded `updateMany` on unique-constraint conflict | The `create` wins the race on a first run; the loser falls through to an update that only claims a row not already `COMPLETED`. Between them, two workers can never both reach the provider for one invoice. |
| Payment: `applyPaymentCompletion` guarded on `status: PROCESSING` | A duplicate delivery arriving after another attempt already settled finds nothing to move and reports it, rather than writing a second audit trail. |
| Exception: `recordException()` upserts on `[organizationId, type, entityId]` | A retried worker never opens the same exception twice; `status` is left untouched on update so a re-drive can't reopen one a human already resolved. |
| Exception resolution: guarded on `OPEN`/`UNDER_REVIEW` | A resolved or rejected exception is terminal — re-deciding it would rewrite a signed-off financial judgement. `POST .../resolve` on an already-closed exception is a `409 INVALID_STATE`. |
| Exception resolution: invoice release guarded on `status: EXCEPTION` | Can only ever release an invoice matching actually blocked — never re-approve a `PAID` or `FAILED` one. |

## Retries and terminal failure

Both queues use `DEFAULT_JOB_OPTIONS`: 3 attempts, exponential backoff. A business outcome — a
`MISMATCHED` verdict, a refused payment — returns normally and is never retried; only a genuine
technical failure (DB/Redis blip, provider timeout) is rethrown for BullMQ to retry.

- **Matching**: `VALIDATION_ERROR` and `NOT_FOUND` fail identically on every attempt and go terminal
  immediately. A `CONFLICT` (another attempt already matched this invoice) is treated as success, not
  a failure. Once attempts are exhausted on a real technical failure, `recordMatchingSystemFailure()`
  opens a `SYSTEM_FAILURE` exception and writes a `WORKFLOW_FAILED` audit row — the invoice is left
  wherever it was, not forced to a dead-end status, so matching can be safely re-driven once the
  underlying problem is fixed.
- **Payment**: `VALIDATION_ERROR` and `PAYMENT_BLOCKED` go terminal immediately (a malformed amount or
  an outright-refused charge will not succeed on retry). Once attempts are exhausted,
  `applyPaymentFailure()` sets `Payment FAILED`, opens a `PAYMENT_FAILURE` exception, and writes
  `WORKFLOW_FAILED`. The invoice itself stays `APPROVED` — it is still a legitimate debt — so a human
  can re-drive payment once the provider is healthy again.

## Audit trail

Every state change in this stage writes an `AuditLog` row: `MATCH_STARTED`, `MATCH_COMPLETED` (with
the check counts), `EXCEPTION_CREATED`, `EXCEPTION_RESOLVED`, `PAYMENT_APPROVED` (once when matching
clears an invoice, again if an exception override releases one), `PAYMENT_COMPLETED`, and
`WORKFLOW_FAILED` on either worker's terminal failure.

`EXCEPTION_CREATED` is written once, centrally, inside `recordException()` itself — not by each call
site — so every path that can open an exception (matching, sourcing, PO approval) gets an audit row
for free and none can skip it. `recordException()` pre-reads the row before its upsert to tell
create from update and only audits the create; a retried worker racing a concurrent duplicate
delivery can lose that pre-read and log `EXCEPTION_CREATED` twice for what upserts to a single
`Exception` row (the row itself stays unique — the unique constraint on
`[organizationId, type, entityId]` guards that, not the audit read) — an accepted over-observation
rather than a correctness bug.

## Not built

- No Socket.IO events — the `matching.completed`, `exception.created`, `exception.resolved`, and
  `payment.completed` events in CLAUDE.md's realtime spec do not exist yet. Poll `GET /invoices/:id`
  and `GET /exceptions` instead.
- No `GET /payments` or `GET /payments/:id` endpoint. A payment's state is only visible indirectly,
  through `Invoice.status` — there is no standalone payment read endpoint today.
- No partial exception resolution UI concept: resolving one of two open exceptions on an invoice does
  not release it — the API reports `releasedForPayment: false` and the caller must resolve the rest.

`GET /audit-logs` **is** implemented and queryable — see `api-docs/audit-logs-api.md`. Every audit
action listed above (`MATCH_STARTED`, `EXCEPTION_CREATED`, `PAYMENT_COMPLETED`, etc.) is fetchable
through it today.
