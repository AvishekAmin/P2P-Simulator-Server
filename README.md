# p2p-simulator

Standalone backend for an AI-powered Procure-to-Pay (P2P) hackathon MVP. A natural-language purchase
request goes in; a matched, paid (or human-reviewed) invoice comes out the other end, end to end:

```text
"I need 100 wireless keyboards under ₹2000 each within 7 days"
        │
        ▼  POST /api/v1/requisitions
Requirement extraction (Gemini)  →  Supplier discovery + ranking (deterministic)
        │
        ▼  automatic
Purchase Order  →  Approval  →  Shipment  →  Simulated goods receipt
        │
        ▼  POST /api/v1/invoices (multipart upload)
Invoice OCR (Gemini Vision)  →  Three-way match (deterministic)
        │
        ├─ MATCHED     → automatic simulated payment → PAID
        └─ MISMATCHED  → Exception → POST /api/v1/exceptions/:id/resolve → payment or reject
```

See `CLAUDE.md` for the full architecture, non-negotiable rules, and coding conventions this repo is
built against. See `api-docs/README.md` for the frontend-facing contract (start there if you're
building a UI against this backend), and `architecture/*.md` for how each stage works internally.

## Stack

Node.js, TypeScript, Express, PostgreSQL (Prisma), Redis (BullMQ), Zod, Gemini API, Cloudinary.
No authentication yet — see [Auth](#auth-mvp) below.

## Setup

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, CLOUDINARY_*, GEMINI_API_KEY, etc.
docker compose up -d redis
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:seed     # optional: sample suppliers/products for local testing
pnpm run dev              # API server on http://localhost:4000
pnpm run dev:worker       # worker process (separate terminal — required for anything to progress)
```

The API and the worker process are **two separate processes**. The API only ever persists and
enqueues; every AI call, OCR pass, matching run, and payment charge happens in `pnpm run dev:worker`.
If nothing seems to progress past an initial `202`/`201` response, check that the worker process is
running and pointed at the same Redis/Postgres.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run dev` | API server with hot reload (`tsx watch`) |
| `pnpm run dev:worker` | Worker process with hot reload |
| `pnpm run dev:all` | Both, in parallel |
| `pnpm run build` | Compile to `dist/` |
| `pnpm start` / `pnpm run start:worker` | Run compiled output |
| `pnpm run typecheck` | `tsc --noEmit` |
| `pnpm run lint` / `pnpm run lint:fix` | Biome |
| `pnpm test` / `pnpm run test:watch` | Vitest |
| `pnpm run prisma:generate` / `:migrate` / `:seed` / `:studio` | Prisma CLI shortcuts |

## Health checks

- `GET /health` — liveness, always 200, no dependency calls.
- `GET /ready` — readiness, checks Postgres + Redis, returns 503 if either is unreachable.

## Auth (MVP)

There is no real authentication yet. `src/middleware/auth.ts` attaches a fixed
`DEV_ORGANIZATION_ID` / `DEV_USER_ID` (from `.env`) to every `/api/v1` request as `req.auth`, so
tenant-scoped queries can be written now and Clerk can be dropped in later without touching
controllers or services. Every response is still scoped as if multi-tenant: a record belonging to
another `organizationId` is a `404`, never a `403` — do not build a UI that assumes a single global
tenant. Pass `x-organization-id` explicitly if you need to exercise more than one dev tenant locally.

## The end-to-end workflow

Every stage after the initial `POST /requisitions` call is either a client action (approve/reject a
PO, simulate a receipt, upload an invoice, resolve an exception) or fully automatic — a background
worker picks up a queued job and you find out by polling the relevant `GET` endpoint. There is no
Socket.IO yet; polling is the only mechanism today.

| # | Stage | Trigger | Queue → worker | Terminal states | Docs |
| - | --- | --- | --- | --- | --- |
| 1 | Requirement extraction | `POST /requisitions` (+ follow-up `POST .../messages` if `NEEDS_CLARIFICATION`) | `requisition` → `requisition.worker.ts` (Gemini) | `REQUIREMENTS_EXTRACTED`, `NEEDS_CLARIFICATION`, `FAILED` | `architecture/conversational-requirements.md`, `api-docs/requisitions-api.md` |
| 2 | Supplier discovery + ranking | automatic | `supplier-discovery` → `supplierDiscovery.worker.ts` (deterministic scoring, no AI) | `SUPPLIER_SELECTED`, or `Requisition.FAILED` + `NO_SUPPLIER_FOUND` exception | `architecture/supplier-discovery.md`, `api-docs/sourcing-api.md` |
| 3 | Purchase order + approval | automatic PO creation; `POST /purchase-orders/:id/approve\|reject` by a human | `purchase-order` → `purchaseOrder.worker.ts` | `PO_CREATED` (PO itself: `PENDING_APPROVAL` → `APPROVED`/`REJECTED`) | `architecture/purchase-orders.md`, `api-docs/purchase-orders-api.md` |
| 4 | Shipment + simulated goods receipt | automatic shipment on approval; `POST /receipts/simulate` simulates IoT delivery | — (synchronous) | Shipment `DELIVERED`, PO `RECEIVED` | `architecture/goods-receipt.md`, `api-docs/receipts-api.md` |
| 5 | Invoice upload + OCR | `POST /invoices` (multipart) | `invoice` → `invoice.worker.ts` (Gemini Vision) | `EXTRACTED`, or `FAILED` + `INVOICE_EXTRACTION_FAILED` exception | `architecture/invoices.md`, `api-docs/invoices-api.md` |
| 6 | Three-way matching | automatic | `matching` → `matching.worker.ts` (deterministic, **no AI** — CLAUDE.md §9) | `APPROVED` (clean match), or `EXCEPTION` + one exception per failing check group | `architecture/matching-and-payment.md`, `api-docs/exceptions-api.md` |
| 7 | Payment | automatic on `APPROVED`; also re-triggered by an exception override | `payment` → `payment.worker.ts` (simulated provider) | `PAID`, or `Payment.FAILED` + `PAYMENT_FAILURE` exception | `architecture/matching-and-payment.md`, `api-docs/exceptions-api.md` |
| 8 | Exception resolution | `POST /exceptions/:id/resolve` by a human | — (synchronous; re-enqueues `payment` on release) | `RESOLVED` (may release the invoice) / `REJECTED` (terminal for that exception) | `api-docs/exceptions-api.md` |

`Requisition.status` only advances through stage 3 (`CREATED → PROCESSING → REQUIREMENTS_EXTRACTED →
SUPPLIER_SELECTED → PO_CREATED`, or `NEEDS_CLARIFICATION`/`FAILED`). Stages 4–8 are tracked on their
own entities — `PurchaseOrder.status`, `Shipment`/`GoodsReceipt`, `Invoice.status`, and `Exception` —
not on the requisition. `api-docs/README.md` has the full state-machine tables and the client polling
strategy for each one.

### The two places money and quantities are decided

Two invariants hold everywhere in this codebase and are worth knowing before touching any of the
services above:

- **Money is always integer minor units (paise), never floating point.** `₹1,820` is stored and
  compared as `182000`. Gemini transcribes printed amounts as decimal strings; TypeScript converts
  them to paise and does all arithmetic — an LLM never calculates a total that governs payment.
- **AI interprets; deterministic TypeScript decides.** Requirement extraction and invoice OCR are the
  only two places Gemini is called. Supplier ranking (`src/rules/supplierRanking.ts`), PO approval
  (`src/rules/approvalRules.ts`), three-way matching (`src/rules/threeWayMatch.ts`), and the payment
  gate (`src/rules/paymentRules.ts`) are all pure, unit-tested TypeScript with no model in the loop.

### Idempotency

Every queue job may be delivered more than once (BullMQ retries technical failures up to 3 times with
exponential backoff). Every worker re-loads its own state from Postgres and guards its state
transitions with conditional `updateMany`/`upsert` calls rather than trusting the job payload — see
the "Idempotency" section in each `architecture/*.md` doc for the specific guard on that stage. A
*business* outcome (no eligible supplier, a mismatched invoice, a refused payment) is never retried —
it returns normally and is recorded as an exception instead.

## Testing

```bash
pnpm test
```

Unit tests cover the deterministic rule modules directly (`supplierRanking`, `approvalRules`,
`threeWayMatch`, `paymentRules`, `receiptRules`) plus worker- and service-level tests for each queue
consumer (`tests/*.worker.test.ts`) and the exception resolution flow
(`tests/exceptionResolution.test.ts`). Gemini, Cloudinary, and the payment provider are mocked in
every automated test — nothing in `pnpm test` calls a live external service.
