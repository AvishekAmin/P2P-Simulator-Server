# Shipment and Simulated Goods Receipt

The stage between purchase-order approval and invoice matching: an approved purchase order already
carries a shipment, and a delivery event turns that shipment into a `GoodsReceipt` — the record of
what actually arrived.

See `architecture/purchase-orders.md` for the stage that feeds this one,
`architecture/invoices.md` for the stage that follows, and `api-docs/receipts-api.md` for the client
contract.

## Flow

```text
PO approved (endpoint or auto-approval)
    └─ createShipment()  → Shipment IN_TRANSIT, trackingNumber derived from the PO id
            │
            ▼  (a delivery happens — simulated)
POST /api/v1/receipts/simulate
            │
            ▼
src/services/receipt.service.ts · recordGoodsReceipt()
    load shipment (tenant-scoped)          → missing?          404
    buildReceiptLines() + receiptStatus()  → deterministic, before any transaction
    already has a GoodsReceipt?            → same quantities?  return it, 200, no writes
                                           → different ones?   CONFLICT
    assertReceivable()                     → CREATED shipment / non-approved PO → INVALID_STATE
            │
            ▼  one transaction
    Shipment  IN_TRANSIT → DELIVERED   (guarded claim; a lost race is a CONFLICT)
    GoodsReceipt created with a ReceiptItem per ordered line
    PurchaseOrder APPROVED|SHIPPED → RECEIVED
    AuditLog GOODS_RECEIVED
            │
            ▼
        (stop — invoice upload is the next client action)
```

## Where the rules live

`src/rules/receiptRules.ts` is pure and free of I/O, so a malformed payload never opens a
transaction, and the arithmetic is unit-testable on its own (`tests/receiptRules.test.ts`).

- `acceptedQuantity = receivedQuantity - damagedQuantity`. **Three-way matching compares
  `acceptedQuantity` against the invoice**, never `receivedQuantity`: damaged units physically
  arrived but will not be paid for. The demo case — ordered 100, received 98, damaged 2 — accepts 96
  and is expected to raise `QUANTITY_MISMATCH` against a 100-unit invoice.
- Receipt status is `COMPLETED` only when every line's accepted quantity equals the ordered quantity;
  anything short of that (a short delivery, or a full one with damage) is `PARTIAL`. `PENDING` is
  unused — a `GoodsReceipt` row only exists once goods have arrived.
- Over-receipt is refused. The simulator does not model receiving more than was ordered.
- A receipt recording zero units is refused: it would move the purchase order to `RECEIVED` on no
  goods at all. A delivery where nothing arrived is a shipment problem, not a receipt.
- `GoodsReceipt.receivedBy` falls back to the calling actor's id (`input.receivedBy ?? input.actorId
  ?? null`) when the request omits it — for `POST /receipts/simulate` that means the dev-tenant user,
  never `null`. The request schema types `receivedBy` as an optional string, not nullable, so a caller
  cannot pass `receivedBy: null` through this endpoint to force the field to `null`; that would fail
  Zod validation before reaching the service.

## Purchase-order lifecycle

For the MVP the lived lifecycle is `APPROVED → RECEIVED`. Approval leaves the purchase order
`APPROVED` with its shipment `IN_TRANSIT`; nothing writes `SHIPPED`. The receipt accepts `SHIPPED` as
a valid pre-state anyway, so adding a shipping step later needs no change here.

## Idempotency

| Guard | What it protects |
| --- | --- |
| `GoodsReceipt.shipmentId` is `@unique` | One receipt per shipment, enforced by the database. A genuine race surfaces as Prisma `P2002` → 409. |
| Early return when the shipment already has a receipt | A replayed delivery answers 200 with the receipt on file and writes no second audit row. The submitted quantities are compared first: a replay reporting *different* numbers is a `CONFLICT`, so a warehouse correcting 98 → 100 is never told the correction landed while matching keeps using the stored 96. |
| Guarded `shipment.updateMany({ status: IN_TRANSIT })` | Two concurrent deliveries cannot both claim the shipment; the loser gets `CONFLICT` and writes nothing. |
| `purchaseOrder.updateMany({ status: { in: [APPROVED, SHIPPED] } })` | Never drags a purchase order backwards; a PO already `RECEIVED` is left alone. |
| Nested `items: { create: [...] }` | A rollback can never leave an item-less receipt. |

## Failure modes

| Situation | Result |
| --- | --- |
| Shipment belongs to another organization, or does not exist | 404 `NOT_FOUND` — a 403 would confirm the id exists |
| Shipment still `CREATED` | 409 `INVALID_STATE` — it has not left the supplier |
| Shipment `DELIVERED` but carrying no receipt | 409 `INVALID_STATE`. The two are written in one transaction, so this is corrupt state; it is reported, never silently repaired by back-filling a receipt |
| Purchase order not `APPROVED`/`SHIPPED` | 409 `INVALID_STATE` |
| Damaged > received, received > ordered, or nothing received | 400 `VALIDATION_ERROR`, nothing written |
| Flat payload against a multi-line purchase order | 400 `VALIDATION_ERROR` — use `items[]` |
| Concurrent delivery won the claim | 409 `CONFLICT` |
| Replay reporting different quantities than the receipt on file | 409 `CONFLICT` — a receipt is immutable, and there is no correction endpoint |

## Not built

No exception is raised for a partial or damaged receipt. `QUANTITY_MISMATCH` belongs to three-way
matching, which compares the purchase order, this receipt and the invoice; raising it here would
report the same problem twice.

No realtime event is emitted — the Socket.IO layer does not exist yet. The `GOODS_RECEIVED` audit row
is the durable record.

## Extending to real IoT

`recordGoodsReceipt()` takes plain values and knows nothing about Express, so an IoT webhook or a
worker can call it directly. Such a caller passes `actorType: "SYSTEM"` instead of the endpoint's
`"USER"`, and reports per-line quantities with `items[]`.
