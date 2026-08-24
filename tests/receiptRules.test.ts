import { describe, expect, it } from "vitest";
import { buildReceiptLines, type OrderedLine, receiptStatus } from "../src/rules/receiptRules.js";
import { AppError } from "../src/utils/AppError.js";

const KEYBOARDS: OrderedLine = { id: "poi-1", productId: "prod-kb", quantity: 100 };
const MICE: OrderedLine = { id: "poi-2", productId: "prod-mouse", quantity: 50 };

function expectValidationError(fn: () => unknown, match: RegExp): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("VALIDATION_ERROR");
    expect((error as AppError).message).toMatch(match);
    return;
  }
  throw new Error("expected a validation error");
}

describe("buildReceiptLines — flat payload", () => {
  it("accepts a full delivery", () => {
    const lines = buildReceiptLines([KEYBOARDS], { receivedQuantity: 100, damagedQuantity: 0 });

    expect(lines).toEqual([
      {
        purchaseOrderItemId: "poi-1",
        productId: "prod-kb",
        orderedQuantity: 100,
        receivedQuantity: 100,
        damagedQuantity: 0,
        acceptedQuantity: 100,
      },
    ]);
    expect(receiptStatus(lines)).toBe("COMPLETED");
  });

  it("subtracts damaged units from the accepted quantity", () => {
    // The demo case: matching compares 96 accepted against a 100-unit invoice.
    const lines = buildReceiptLines([KEYBOARDS], { receivedQuantity: 98, damagedQuantity: 2 });

    expect(lines[0]).toMatchObject({
      receivedQuantity: 98,
      damagedQuantity: 2,
      acceptedQuantity: 96,
    });
    expect(receiptStatus(lines)).toBe("PARTIAL");
  });

  it("treats a fully delivered but partly damaged shipment as PARTIAL", () => {
    const lines = buildReceiptLines([KEYBOARDS], { receivedQuantity: 100, damagedQuantity: 5 });

    expect(lines[0]?.acceptedQuantity).toBe(95);
    expect(receiptStatus(lines)).toBe("PARTIAL");
  });

  it("defaults damagedQuantity to zero", () => {
    const lines = buildReceiptLines([KEYBOARDS], { receivedQuantity: 100 });

    expect(lines[0]).toMatchObject({ damagedQuantity: 0, acceptedQuantity: 100 });
  });

  it("refuses a receipt with nothing in it", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS], { receivedQuantity: 0 }),
      /at least one received unit/i,
    );
  });

  it("refuses more damaged units than received", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS], { receivedQuantity: 10, damagedQuantity: 11 }),
      /damaged quantity cannot exceed/i,
    );
  });

  it("refuses an over-receipt", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS], { receivedQuantity: 101 }),
      /cannot exceed the ordered quantity/i,
    );
  });

  it("refuses a negative received quantity", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS], { receivedQuantity: -5 }),
      /receivedQuantity must be a whole, non-negative number/i,
    );
  });

  it("refuses a negative damaged quantity", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS], { receivedQuantity: 10, damagedQuantity: -1 }),
      /damagedQuantity must be a whole, non-negative number/i,
    );
  });

  it("refuses a fractional received quantity", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS], { receivedQuantity: 10.5 }),
      /receivedQuantity must be a whole, non-negative number/i,
    );
  });

  it("refuses a fractional damaged quantity", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS], { receivedQuantity: 10, damagedQuantity: 1.5 }),
      /damagedQuantity must be a whole, non-negative number/i,
    );
  });

  it("refuses the flat form on a multi-line purchase order", () => {
    expectValidationError(
      () => buildReceiptLines([KEYBOARDS, MICE], { receivedQuantity: 100 }),
      /multiple line items/i,
    );
  });

  it("refuses a purchase order with no line items", () => {
    expectValidationError(() => buildReceiptLines([], { receivedQuantity: 1 }), /no line items/i);
  });
});

describe("buildReceiptLines — explicit items[]", () => {
  it("maps each reported line onto its ordered line", () => {
    const lines = buildReceiptLines([KEYBOARDS, MICE], {
      items: [
        { purchaseOrderItemId: "poi-1", receivedQuantity: 100, damagedQuantity: 0 },
        { purchaseOrderItemId: "poi-2", receivedQuantity: 48, damagedQuantity: 3 },
      ],
    });

    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatchObject({ orderedQuantity: 50, acceptedQuantity: 45 });
    expect(receiptStatus(lines)).toBe("PARTIAL");
  });

  it("records an omitted line as nothing received", () => {
    const lines = buildReceiptLines([KEYBOARDS, MICE], {
      items: [{ purchaseOrderItemId: "poi-1", receivedQuantity: 100, damagedQuantity: 0 }],
    });

    expect(lines[1]).toMatchObject({
      purchaseOrderItemId: "poi-2",
      receivedQuantity: 0,
      damagedQuantity: 0,
      acceptedQuantity: 0,
    });
    expect(receiptStatus(lines)).toBe("PARTIAL");
  });

  it("refuses a line item from another purchase order", () => {
    expectValidationError(
      () =>
        buildReceiptLines([KEYBOARDS], {
          items: [{ purchaseOrderItemId: "poi-other", receivedQuantity: 5, damagedQuantity: 0 }],
        }),
      /does not belong to this purchase order/i,
    );
  });

  it("refuses the same line item reported twice", () => {
    expectValidationError(
      () =>
        buildReceiptLines([KEYBOARDS], {
          items: [
            { purchaseOrderItemId: "poi-1", receivedQuantity: 50, damagedQuantity: 0 },
            { purchaseOrderItemId: "poi-1", receivedQuantity: 50, damagedQuantity: 0 },
          ],
        }),
      /reported twice/i,
    );
  });

  it("refuses a negative quantity inside items[]", () => {
    expectValidationError(
      () =>
        buildReceiptLines([KEYBOARDS], {
          items: [{ purchaseOrderItemId: "poi-1", receivedQuantity: -1, damagedQuantity: 0 }],
        }),
      /receivedQuantity must be a whole, non-negative number/i,
    );
  });

  it("refuses a fractional quantity inside items[]", () => {
    expectValidationError(
      () =>
        buildReceiptLines([KEYBOARDS], {
          items: [{ purchaseOrderItemId: "poi-1", receivedQuantity: 2.5, damagedQuantity: 0 }],
        }),
      /receivedQuantity must be a whole, non-negative number/i,
    );
  });

  it("refuses an items[] payload where nothing arrived", () => {
    expectValidationError(
      () =>
        buildReceiptLines([KEYBOARDS, MICE], {
          items: [
            { purchaseOrderItemId: "poi-1", receivedQuantity: 0, damagedQuantity: 0 },
            { purchaseOrderItemId: "poi-2", receivedQuantity: 0, damagedQuantity: 0 },
          ],
        }),
      /at least one received unit/i,
    );
  });
});
