                         ┌──────────────────────┐
                         │       Next.js        │
                         │                      │
                         │  Dashboard           │
                         │  Procurement UI      │
                         │  Supplier UI         │
                         │  PO UI               │
                         │  Invoice UI          │
                         │  Exception UI        │
                         └──────────┬───────────┘
                                    │ HTTPS, REST polling (no realtime yet — see Realtime below)
                                    ▼
                         ┌──────────────────────┐
                         │    Express API       │
                         │    TypeScript        │
                         │                      │
                         │ Dev-tenant header    │
                         │ Zod validation       │
                         │ CRUD / Commands      │
                         │ API orchestration    │
                         └───────┬───────┬──────┘
                                 │       │
                         sync    │       │ async — enqueue only, never await AI/OCR/matching/payment
                                 │       ▼
                                 │   ┌─────────────┐
                                 │   │ Redis       │
                                 │   │ BullMQ      │
                                 │   │ 6 queues    │
                                 │   └──────┬──────┘
                                 │          │
                                 │  ┌───┬───┼────┬────┬─────┐
                                 │  │   │   │    │    │     │
                                 │  ▼   ▼   ▼    ▼    ▼     ▼
                                 │ Req. Sup. PO   Inv. Match Pay.
                                 │ Wkr  Disc. Wkr Wkr  Wkr   Wkr
                                 │  │   │   │    │    │     │
                                 │  └───┴───┴────┴────┴─────┘
                                 │          │
                                 ▼          ▼
                         ┌──────────────────────┐
                         │     PostgreSQL       │
                         │       Prisma         │
                         └──────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                    ┌───────────┐       ┌──────────┐
                    │ Cloudinary│       │ Gemini   │
                    │ Documents │       │ AI/Vision│
                    └───────────┘       └──────────┘

Business Flow:
User Request
     ↓
Requirement Extraction
     ↓
Supplier Discovery
     ↓
Supplier Ranking
     ↓
Supplier Selection
     ↓
PO Generation
     ↓
PO Approval
     ↓
Shipment
     ↓
Goods Receipt
     ↓
Invoice Upload
     ↓
Invoice OCR + Extraction
     ↓
3-Way Matching
     ↓
 ┌───┴────┐
 ↓        ↓
PASS     FAIL
 ↓        ↓
Payment  Exception
          ↓
     Human Approval

## Where this MVP deliberately diverges from CLAUDE.md's default stack

CLAUDE.md's "Stack" section lists the intended tech for this class of project. A few choices made
during the four-day build differ from that list on purpose — each is a scoped substitution behind
the same abstraction CLAUDE.md asks for, not a rule violation:

| CLAUDE.md says | Actually built | Why |
| --- | --- | --- |
| S3 for documents | **Cloudinary** (`src/storage/cloudinary.storage.ts`, behind `StorageProvider` — `src/storage/storage.interface.ts`) | Faster to provision for a hackathon; same signed-URL, private-bucket contract CLAUDE.md's §6 asks for. Swapping in `S3StorageProvider` later means implementing the interface, not touching callers. |
| Clerk auth | **No auth — a dev-tenant shim** (`src/middleware/auth.ts`) | CLAUDE.md's own §"Authentication and multi-tenancy" preamble says "there is no authentication yet for the MVP." `attachTenant` trusts an `x-organization-id` header, falling back to `DEV_ORGANIZATION_ID`/`DEV_USER_ID` env vars, with an explicit `TODO(auth): replace with Clerk`. Tenant *isolation* (every query scoped by `organizationId`) is still enforced — only *authentication* (proving who the caller is) is stubbed. |
| Pino (or equivalent) structured logger | **`console.log`/`console.error`** only | CLAUDE.md's top-level project note says explicitly: "No logging library is used." No logger dependency exists in `package.json`. |
| Socket.IO realtime | **REST polling** | Socket.IO is not installed and no server is wired up. Every automatic/worker-driven transition (`GET /requisitions/:id`, `/shipments/:id`, `/invoices/:id`) is observed by polling — see `api-docs/README.md`'s "Polling, not sockets" section. Realtime is a planned addition, not a regression. |

None of these change the non-negotiable rules in CLAUDE.md — organization scoping, Zod validation,
deterministic financial decisions, and async-only AI/OCR/matching/payment all hold regardless of
which storage/auth/logging backend sits behind the interface.

## Workers and queues

Six BullMQ queues, one worker each, all started from `src/workers/index.ts` as an independently
scalable process from the API (`pnpm run dev:worker`, separate from `pnpm run dev`):

| Queue (`src/config/constants.ts` → `QUEUE_NAMES`) | Job name | Worker | Enqueued by |
| --- | --- | --- | --- |
| `requisition` | `extract-requirements` | `src/workers/requisition.worker.ts` | Requisition API on create/message |
| `supplier-discovery` | `discover-suppliers` | `src/workers/supplierDiscovery.worker.ts` | Requisition worker, once requirements are complete |
| `purchase-order` | `create-purchase-order` | `src/workers/purchaseOrder.worker.ts` | Supplier-discovery worker, once a supplier is selected |
| `invoice` | `process-invoice` | `src/workers/invoice.worker.ts` | Invoice upload API |
| `matching` | `run-three-way-match` | `src/workers/matching.worker.ts` | Invoice worker, once extraction succeeds |
| `payment` | `process-payment` | `src/workers/payment.worker.ts` | Matching worker (clean match) or exception resolution (override) |

All six share `DEFAULT_JOB_OPTIONS` (3 attempts, exponential backoff, `src/config/constants.ts`).
Workers are idempotent by design — see each stage's own architecture doc for its specific guards.

### The one place the API waits on a worker

CLAUDE.md §9/§13 forbid the API waiting on long-running AI/OCR work, but the requisition chat
endpoints (`POST /requisitions`, `POST /requisitions/:id/messages`) are a deliberate, narrow
exception: `src/queues/jobResult.ts` (`awaitJobResult`, via BullMQ's `QueueEvents`) lets the
controller block briefly — bounded by a short timeout — on the *requirement-extraction* job's result,
so a chat turn can return the assistant's reply synchronously instead of forcing the frontend into an
immediate poll loop. On timeout it returns `202` with the job still running, and the client falls back
to polling `GET /requisitions/:id` exactly as it would for every other stage. This is a UX
optimization for a single fast (~seconds) Gemini call, not a general pattern — no other stage
(supplier discovery, invoice OCR, matching, payment) is ever awaited synchronously.

## Rate limiting

`src/middleware/rateLimit.ts` (`express-rate-limit`) applies an in-memory limit — 100 requests/minute
per key — to the entire `/api/v1` router (`apiRateLimit`, mounted in `src/routes/index.ts`).
`/health` and `/ready` are excluded so uptime checks are never throttled. This is a single-process,
in-memory limiter (no Redis-backed store) — adequate for one API instance in the MVP, not something
that survives horizontal scaling without a shared store.

## Payments

`src/payments/payment.interface.ts` defines `PaymentProvider`; the only implementation is
`SimulatedPaymentProvider` (`src/payments/simulated.payment.ts`) — see
`architecture/matching-and-payment.md` for its behavior. This matches CLAUDE.md §11's abstraction
exactly; only the concrete provider is simulated.

## Directory structure (actual)

```text
p2p-simulator/
│
├── src/
│   ├── ai/                # AIProvider interface, GeminiProvider, versioned prompts (ai/prompts/)
│   ├── config/             # env.ts (Zod-validated), prisma.ts, redis.ts, constants.ts
│   ├── controllers/
│   ├── generated/prisma/   # Prisma client output (checked in — do not hand-edit)
│   ├── middleware/         # auth.ts (dev-tenant shim), rateLimit.ts, upload.ts, errorHandler.ts, notFound.ts
│   ├── payments/           # PaymentProvider interface + SimulatedPaymentProvider
│   ├── queues/             # one file per queue + jobResult.ts (awaitJobResult)
│   ├── routes/
│   ├── rules/               # deterministic TypeScript: approvalRules, threeWayMatch, paymentRules, supplierRanking, receiptRules, requirementRules, productMatching
│   ├── services/
│   ├── storage/             # StorageProvider interface + CloudinaryStorageProvider
│   ├── types/
│   ├── workers/             # index.ts registers all six workers
│   ├── zod/                 # request/queue-payload/AI-response schemas (CLAUDE.md calls this src/validators/ — actual name is src/zod/)
│   ├── app.ts                # Express app factory
│   └── server.ts             # process entrypoint — starts the HTTP listener
│
├── prisma/
│   └── schema.prisma
│
├── tests/
├── api-docs/                 # this directory's sibling — frontend-facing API reference
├── architecture/              # this file's directory — backend design docs
├── .env.example
├── package.json
└── CLAUDE.md
```

There is no `Dockerfile` in the repository yet, despite one being listed in CLAUDE.md's reference
tree — containerizing the API/worker processes is unstarted work, not an oversight to preserve.

## Environment variables (actual, `src/config/env.ts`)

Validated with Zod at startup; the process exits immediately on a missing/invalid value.

```env
NODE_ENV=
PORT=4000                      # default

DATABASE_URL=                  # Postgres, via @prisma/adapter-pg
DIRECT_DATABASE_URL=           # non-pooled, for migrations

REDIS_URL=redis://localhost:6379   # default

GEMINI_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

CORS_ORIGIN=                   # optional

DEV_ORGANIZATION_ID=dev-org    # default — dev-tenant fallback, see auth section above
DEV_USER_ID=dev-user           # default
```

No `AWS_*` or `CLERK_SECRET_KEY` variables exist — see the substitutions table above.
