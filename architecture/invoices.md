# Invoice Upload and Extraction

The stage between goods receipt and three-way matching: a supplier's invoice document is uploaded
against a purchase order, stored in Cloudinary, and read by Gemini Vision into structured fields.

See `architecture/goods-receipt.md` for the stage that feeds this one, and
`api-docs/invoices-api.md` for the client contract.

## Flow

```text
POST /api/v1/invoices   (multipart: file + purchaseOrderId)
        │
        ▼
src/services/invoice.service.ts · createInvoice()
    load purchase order (tenant-scoped)   → missing?                404
    status invoiceable?                   → DRAFT/PENDING/REJECTED  INVALID_STATE
    randomUUID() → invoiceId
    storage.upload()                      → MIME + size + magic bytes checked here
        │
        ▼  one transaction
    Invoice created UPLOADED, fileUrl / filePublicId recorded
    AuditLog INVOICE_UPLOADED
        │                                  (transaction failed? delete the uploaded object)
        ▼
    enqueueInvoice()  →  202 Accepted, no OCR performed
        │
        ▼  queue: invoice · job: process-invoice
src/workers/invoice.worker.ts
    load invoice (tenant-scoped)
    already extracted / FAILED?            → return early (see Idempotency)
    claim  UPLOADED → PROCESSING           (guarded; increments extractionAttempts)
    storage.download()  →  Gemini analyzeDocument()  →  JSON.parse  →  Zod
    AIProcessingLog (both outcomes)
        │
        ▼  one transaction
    Invoice  PROCESSING → EXTRACTED, money converted to paise in TypeScript
    InvoiceItems replaced, numbered from 1
    AuditLog INVOICE_EXTRACTED (actorType AI)
        │
        ▼
    enqueueMatching()   (queue consumer not built yet — see Not built)
```

The API never calls Gemini. Extraction is a multi-second vision call against a PDF, so the request
handler's job ends at persisting the document and queueing the work (CLAUDE.md §9).

## Upload ordering

`Invoice.fileUrl` and `filePublicId` are non-nullable, so the row cannot exist before the upload
finishes. Rather than create a row with placeholder columns and update it afterwards, the invoice id
is generated up front with `randomUUID()`, the Cloudinary object is keyed on it, and only then is the
row written.

The failure direction matters: an upload with no row behind it is a stray object, while a row with no
document is an invoice that can never be extracted. `createInvoice()` therefore deletes the object it
just uploaded if the transaction throws. That cleanup is best-effort and swallows its own error — it
must never mask the failure that actually broke the request.

## Where AI stops

Gemini transcribes the document and does nothing else. It is deliberately given no purchase-order
context: a model told the expected total drifts towards it, and the whole point of matching is to
compare two independently-derived numbers.

- **Money is transcribed, never calculated.** The model returns amounts as the decimal strings
  printed on the page (`"1820.50"`), and `toPaise()` in `src/zod/invoice.schema.ts` converts them to
  integer paise. That conversion is string-based on purpose: `Math.round(1820.15 * 100)` is `182014`
  in IEEE 754.
- **The prompt forbids arithmetic outright** — no summing line items, no reconciling a total that
  disagrees with them, no currency conversion. A total that contradicts the lines is transcribed as
  printed and left for matching to flag.
- **Nothing in `applyInvoiceExtraction()` touches the `PurchaseOrder`.** AI output must never rewrite
  the commitment it is about to be checked against. `tests/invoice.worker.test.ts` asserts this
  directly.
- **Missing is null, never guessed.** A document with no readable PO number yields `poNumberRaw:
  null`, which matching reports as a failed `PO_NUMBER` check — far better than a plausible
  invention that quietly passes.

Extracted values live in `*Raw` columns (`supplierNameRaw`, `poNumberRaw`) precisely because they are
claims made by a document, not facts. The full model response is kept in `rawExtraction` for
debugging a bad extraction after the fact.

## Prompt and schema versioning

`src/ai/prompts/invoice.v1.ts` exports `INVOICE_PROMPT_VERSION = "invoice.v1"`, written to every
`AIProcessingLog` row alongside the model name and latency. A prompt change ships as `invoice.v2`
rather than an edit, so a regression in extraction quality can be traced to the version that caused
it.

The prompt is system-only: `analyzeDocument()` sends the document itself as the user turn, so there
is no `buildInvoiceUserPrompt()` counterpart.

## Idempotency

Assume every job runs more than once.

| Guard | What it protects |
| --- | --- |
| Early return when `status` is `EXTRACTED`/`MATCHING`/`APPROVED`/`EXCEPTION`/`PAID` | A replayed job never sends the document to Gemini twice. An invoice still `EXTRACTED` re-enqueues matching, healing a crash between the extraction commit and the enqueue. |
| Early return when `status` is `FAILED` | A terminal failure carries an open exception awaiting a human; re-driving it would bypass that review. |
| Guarded `updateMany({ status: UPLOADED })` claim | Two workers cannot both extract the same invoice. An invoice found already `PROCESSING` is treated as this job's own earlier attempt and allowed through — otherwise a retry after a Gemini timeout could never make progress. |
| Guarded `updateMany({ status: PROCESSING })` on write | A result arriving for an invoice something else has moved is a `CONFLICT`, not a silent overwrite. |
| `deleteMany` then `createMany` for items | `@@unique([invoiceId, lineNumber])` would reject a retry that previously got this far; replacing the set makes the write repeatable. |
| `recordException()` upserts on `[organizationId, type, entityId]` | Three failed attempts open one exception, not three. |

## Retries and terminal failure

`DEFAULT_JOB_OPTIONS` gives every job 3 attempts with exponential backoff. Cloudinary outages, Gemini
outages, malformed JSON and schema violations are all treated as technical failures and rethrown so
BullMQ retries them — a model that returned junk once often succeeds on the next call.

One case skips the retries: an `AppError` with code `VALIDATION_ERROR` (an empty or corrupt document)
will fail identically on every attempt, so it goes terminal immediately rather than burning two more
Gemini calls on it.

Once the attempts are spent, `applyInvoiceExtractionFailure()` sets the invoice `FAILED`, records
`failureReason`, opens an `INVOICE_EXTRACTION_FAILED` exception at `CRITICAL`, and writes a
`WORKFLOW_FAILED` audit row. The document stays in Cloudinary so a human can look at what the model
could not read.

## File validation

`validateFile()` in `src/storage/cloudinary.storage.ts` is the authoritative check and runs before
any byte leaves the process: MIME type against `ALLOWED_MIME_TYPES` (PDF, PNG, JPEG), size against
`MAX_FILE_SIZE_BYTES` (10 MB), non-empty, and **magic bytes matching the declared type**. The
client's `Content-Type` is untrusted metadata — a `.exe` announced as `application/pdf` is rejected
on its signature.

`src/middleware/upload.ts` deliberately does not duplicate any of that. Multer holds the file in
memory (never on disk — invoice documents should not be left in a temp dir), caps it at the same 10
MB, and its only real job is translating `MulterError` into the standard `VALIDATION_ERROR` envelope
so an oversized upload isn't reported as a 500.

Cloudinary objects are uploaded as `type: "authenticated"`, so the stored `fileUrl` is a signed,
expiring URL and the asset is not publicly readable. `download()` in the worker fetches through that
same signed URL — an unsigned delivery URL 401s.

## Failure modes

| Situation | Result |
| --- | --- |
| Purchase order belongs to another organization, or does not exist | 404 `NOT_FOUND` — a 403 would confirm the id exists |
| Purchase order `DRAFT`, `PENDING_APPROVAL` or `REJECTED` | 409 `INVALID_STATE` — there is no commitment to invoice against |
| No file, or the wrong field name | 400 `VALIDATION_ERROR`, nothing uploaded |
| Unsupported type, over 10 MB, empty, or signature mismatch | 400 `VALIDATION_ERROR`, nothing written |
| Transaction fails after a successful upload | The Cloudinary object is deleted, the error propagates, no job is queued |
| Cloudinary or Gemini unavailable | Retried up to 3 times, then `FAILED` + `INVOICE_EXTRACTION_FAILED` |
| Model returns malformed JSON or a schema violation | Same — retried, then terminal |
| Model returns a total that disagrees with its line items | Stored as transcribed; three-way matching flags it |

## Not built

No duplicate check at upload. `Invoice.invoiceNumber` carries an index but no unique constraint, and
a second invoice for the same purchase order is accepted: `DUPLICATE_INVOICE` is a three-way match
check, and refusing the upload would hide the duplicate rather than record it.

The worker enqueues to the `matching` queue, but no processor is registered for it yet — jobs queue
until `src/rules/threeWayMatch.ts` and the matching worker land. `Invoice.supplierId` is copied from
the purchase order at upload; reconciling it against `supplierNameRaw` is matching's `SUPPLIER` check,
not this stage's job.

No realtime event is emitted — the Socket.IO layer does not exist yet. The `INVOICE_UPLOADED` and
`INVOICE_EXTRACTED` audit rows are the durable record.
