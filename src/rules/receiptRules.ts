import { GoodsReceiptStatus } from "../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";
import type { SimulateReceiptInput } from "../zod/receipt.schema.js";

/** The purchase-order line a receipt is reported against. */
export interface OrderedLine {
  id: string;
  productId: string;
  quantity: number;
}

export interface ReceiptLine {
  purchaseOrderItemId: string;
  productId: string;
  orderedQuantity: number;
  /** Units that physically arrived, damaged ones included. */
  receivedQuantity: number;
  damagedQuantity: number;
  /**
   * receivedQuantity - damagedQuantity.
   *
   * This is the quantity three-way matching must compare against the invoice:
   * damaged units arrived but will not be paid for, so matching that reads
   * `receivedQuantity` would silently accept an invoice for goods the buyer
   * rejected. The demo case — ordered 100, received 98, damaged 2 — accepts 96
   * and is expected to raise QUANTITY_MISMATCH against a 100-unit invoice.
   */
  acceptedQuantity: number;
}

/** The quantity half of a receipt request — the rest of the payload is metadata. */
export type ReceiptQuantities = Pick<
  SimulateReceiptInput,
  "receivedQuantity" | "damagedQuantity" | "items"
>;

/**
 * Maps a receipt request onto the purchase order's lines.
 *
 * Deterministic and free of I/O: the caller runs it before opening a
 * transaction, so a malformed payload never touches the database. Every refusal
 * is a 400 — these are semantic input errors, not workflow states.
 */
export function buildReceiptLines(
  orderedLines: OrderedLine[],
  input: ReceiptQuantities,
): ReceiptLine[] {
  if (orderedLines.length === 0) {
    throw AppError.validation("Purchase order has no line items to receive against");
  }

  const lines =
    input.items === undefined
      ? [buildFlatLine(orderedLines, input)]
      : buildExplicitLines(orderedLines, input.items);

  // A receipt with nothing in it is not a receipt — it would move the purchase
  // order to RECEIVED on no goods at all. A delivery where nothing arrived is a
  // shipment problem, reported elsewhere.
  const totalReceived = lines.reduce((sum, line) => sum + line.receivedQuantity, 0);
  if (totalReceived === 0) {
    throw AppError.validation("A goods receipt must record at least one received unit");
  }

  return lines;
}

/** The flat payload only makes sense when there is exactly one line to apply it to. */
function buildFlatLine(orderedLines: OrderedLine[], input: ReceiptQuantities): ReceiptLine {
  if (orderedLines.length > 1) {
    throw AppError.validation(
      "This purchase order has multiple line items — report quantities with items[]",
      { lineItemCount: orderedLines.length },
    );
  }

  const [ordered] = orderedLines as [OrderedLine];

  return toLine(ordered, input.receivedQuantity ?? 0, input.damagedQuantity ?? 0);
}

function buildExplicitLines(
  orderedLines: OrderedLine[],
  items: NonNullable<SimulateReceiptInput["items"]>,
): ReceiptLine[] {
  const orderedById = new Map(orderedLines.map((line) => [line.id, line]));
  const seen = new Set<string>();

  for (const item of items) {
    const ordered = orderedById.get(item.purchaseOrderItemId);
    if (!ordered) {
      throw AppError.validation("Line item does not belong to this purchase order", {
        purchaseOrderItemId: item.purchaseOrderItemId,
      });
    }
    if (seen.has(item.purchaseOrderItemId)) {
      throw AppError.validation("Line item reported twice in the same receipt", {
        purchaseOrderItemId: item.purchaseOrderItemId,
      });
    }
    seen.add(item.purchaseOrderItemId);
  }

  const reportedById = new Map(items.map((item) => [item.purchaseOrderItemId, item]));

  // Lines the caller left out arrived in zero quantity — a partial delivery has
  // to be representable without listing what did not turn up.
  return orderedLines.map((ordered) => {
    const reported = reportedById.get(ordered.id);
    return toLine(ordered, reported?.receivedQuantity ?? 0, reported?.damagedQuantity ?? 0);
  });
}

function toLine(ordered: OrderedLine, received: number, damaged: number): ReceiptLine {
  // Zod already enforces this on the API payload, but these rules are the last
  // deterministic gate before the database: a caller reaching them by another
  // route must not be able to book fractional or negative goods.
  assertWholeUnits(ordered, "receivedQuantity", received);
  assertWholeUnits(ordered, "damagedQuantity", damaged);

  if (damaged > received) {
    throw AppError.validation("Damaged quantity cannot exceed the received quantity", {
      purchaseOrderItemId: ordered.id,
      receivedQuantity: received,
      damagedQuantity: damaged,
    });
  }
  if (received > ordered.quantity) {
    throw AppError.validation("Received quantity cannot exceed the ordered quantity", {
      purchaseOrderItemId: ordered.id,
      orderedQuantity: ordered.quantity,
      receivedQuantity: received,
    });
  }

  return {
    purchaseOrderItemId: ordered.id,
    productId: ordered.productId,
    orderedQuantity: ordered.quantity,
    receivedQuantity: received,
    damagedQuantity: damaged,
    acceptedQuantity: received - damaged,
  };
}

function assertWholeUnits(
  ordered: OrderedLine,
  field: "receivedQuantity" | "damagedQuantity",
  value: number,
): void {
  if (!Number.isInteger(value) || value < 0) {
    throw AppError.validation(`${field} must be a whole, non-negative number of units`, {
      purchaseOrderItemId: ordered.id,
      [field]: value,
    });
  }
}

/**
 * COMPLETED only when every ordered unit was accepted. Anything short of that —
 * a short delivery, or a full one with damage — is PARTIAL, and three-way
 * matching decides what it costs.
 *
 * PENDING is deliberately unused: a GoodsReceipt row only exists once goods
 * have actually arrived.
 */
export function receiptStatus(lines: ReceiptLine[]): GoodsReceiptStatus {
  const complete = lines.every((line) => line.acceptedQuantity === line.orderedQuantity);
  return complete ? GoodsReceiptStatus.COMPLETED : GoodsReceiptStatus.PARTIAL;
}
