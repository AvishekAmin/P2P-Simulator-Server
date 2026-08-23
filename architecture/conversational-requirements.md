# Conversational Requirement Extraction (Phase 4)

Turns a free-form chat message into a structured `Requirement` the rest of the P2P pipeline can
act on. Handles greetings, irrelevant text, vague asks, corrections, and contradictions across
multiple turns — the requisition only advances to `REQUIREMENTS_EXTRACTED` once a deterministic
check (not the AI) confirms every required field is present and unambiguous.

## Flow

```text
POST /api/v1/requisitions            POST /api/v1/requisitions/:id/messages
        │                                          │
        ▼                                          ▼
 createRequisition()                     appendUserMessage()
   (Requisition + first                   (RequisitionMessage,
    RequisitionMessage,                    status -> PROCESSING)
    status = PROCESSING)
        │                                          │
        └───────────────┬──────────────────────────┘
                         ▼
              enqueue "requisition" job
                         │
                         ▼
              awaitJobResult(queue, jobId, 20s)
                 │                    │
          resolves in time      still running
                 │                    │
                 ▼                    ▼
          200 with result       202 { status: PROCESSING }
                                (client polls GET /:id)
```

```text
Worker: processRequisitionJob
  1. Load requisition (tenant-scoped) + messages, idempotency guard:
     already REQUIREMENTS_EXTRACTED -> return stored result, skip Gemini.
  2. Parse draftRequirements (Json?) with Zod -> DraftRequirements.
  3. Gemini (generateStructured) with requisition.v1 prompt:
     confirmed-so-far draft + last 10 turns + latest message.
  4. JSON.parse + Zod (extractionResultSchema).
     Failure -> retry (BullMQ, up to 3 attempts); on final attempt,
     degrade to a deterministic clarification message instead of failing
     the job outright.
  5. Deterministic layer (src/rules/requirementRules.ts):
       mergeDraft()        — non-null incoming overwrites (= correction)
       normalizeConflicts()
       findMissingFields() — recomputed, AI's own list is advisory only
       isComplete()
  6. Transaction:
       complete   -> create Requirement, status REQUIREMENTS_EXTRACTED,
                      append ASSISTANT message, audit REQUIREMENTS_EXTRACTED
       incomplete -> persist draft/missingFields/conflicts, status
                      NEEDS_CLARIFICATION, append ASSISTANT message,
                      audit REQUISITION_CLARIFICATION_REQUESTED
  7. After commit: AIProcessingLog; if complete, enqueue supplier-discovery.
```

**AI interprets, deterministic code decides**: Gemini's `missingRequiredFields`/`conflicts` are
advisory. `requirementRules.ts` always recomputes completeness from the merged draft, so a
requisition can never reach `REQUIREMENTS_EXTRACTED` on the AI's say-so alone. Gemini's
`userMessage` is only shown to the user if it passes `isUsableClarification()` — a check that
rejects any reply leaking raw field names (`maxUnitPricePaise`, `deliveryDays`, `null`, etc.); a
deterministic fallback message is used otherwise.

## API

### `POST /api/v1/requisitions`

```json
{ "input": "I need 100 wireless keyboards under ₹2000 each within 7 days" }
```

### `POST /api/v1/requisitions/:id/messages`

```json
{ "input": "under ₹2000 each within 7 days" }
```

Rejected with `409 INVALID_STATE` once the requisition is past `NEEDS_CLARIFICATION`/`PROCESSING`
(`REQUIREMENTS_EXTRACTED`, `SUPPLIER_SELECTED`, `PO_CREATED`, `FAILED`).

Both endpoints return one of:

```jsonc
// still needs more info
{ "success": true, "data": {
  "status": "NEEDS_CLARIFICATION", "requisitionId": "...",
  "message": "How many keyboards do you need, and by when?",
  "missingFields": ["quantity", "deliveryDays"], "conflicts": []
}}

// complete
{ "success": true, "data": {
  "status": "PROCESSING", "requisitionId": "...",
  "message": "Got it. I have all the requirements and started the procurement process.",
  "requirements": { "productName": "wireless keyboard", "quantity": 100, ... }
}}

// worker hasn't finished within 20s
{ "success": true, "data": {
  "status": "PROCESSING", "requisitionId": "...",
  "message": "Still working on it…"
}}
```

### `GET /api/v1/requisitions` / `GET /api/v1/requisitions/:id`

Tenant-scoped reads; `:id` includes ordered `messages` and, once extracted, the `requirement`.

All requests are tenant-scoped via the `x-organization-id` header (falls back to
`DEV_ORGANIZATION_ID` — see `src/middleware/auth.ts`); `requireOrganization` 404s unknown orgs.

## Schema additions

- `Requisition`: `draftRequirements Json?`, `clarificationMessage String?`,
  `missingFields String[]`, `conflicts String[]`, `turnCount Int`, `messages` relation.
- `RequisitionMessage` (new model): `role` (`USER`/`ASSISTANT`), `content`, tenant-scoped,
  indexed on `(requisitionId, createdAt)`.
- `AuditAction`: added `REQUISITION_CLARIFICATION_REQUESTED`.
- `Requirement` rows are only created once the draft is complete — partial state lives in
  `Requisition.draftRequirements`, never in `Requirement` itself.

## Key files

```text
src/zod/requisition.schema.ts        API + AI-output + draft schemas
src/rules/requirementRules.ts        merge / missing-field / completeness / message rules (pure)
src/ai/prompts/requisition.v1.ts     versioned system + user prompt
src/ai/index.ts                      getAIProvider() singleton
src/services/requisition.service.ts  create/append/applyExtractionResult/reads
src/services/audit.service.ts        recordAudit (runs inside the same transaction)
src/services/aiLog.service.ts        recordAIProcessing (best-effort, outside the transaction)
src/workers/requisition.worker.ts    processRequisitionJob
src/queues/jobResult.ts              awaitJobResult (QueueEvents-based blocking wait)
src/controllers/requisition.controller.ts
src/routes/requisition.routes.ts
```

## Notes

- Gemini is only ever called from the worker; the API blocks on the job result via BullMQ
  `QueueEvents`, not by doing AI work inline (CLAUDE.md rules 9/13).
- The worker is idempotent: a requisition already at `REQUIREMENTS_EXTRACTED` short-circuits
  before calling Gemini or re-enqueueing supplier discovery.
- Supplier-discovery processing itself, Socket.IO events, and a `REQUIREMENT_INCOMPLETE`
  exception path are out of scope here — clarification is a normal conversational state, not an
  exception.
