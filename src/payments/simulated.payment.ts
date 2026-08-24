import { createHash } from "node:crypto";
import { AppError } from "../utils/AppError.js";
import type { ChargeInput, ChargeResult, PaymentProvider } from "./payment.interface.js";

export const PAYMENT_PROVIDER_NAME = "SIMULATED";

/**
 * The MVP settlement provider: it always succeeds.
 *
 * The reference is a hash of the idempotency key rather than a random string,
 * so a retried job that charges twice still records the same reference — the
 * demo can therefore not manufacture two different-looking payments for one
 * invoice.
 */
export class SimulatedPaymentProvider implements PaymentProvider {
  readonly name = PAYMENT_PROVIDER_NAME;

  charge(input: ChargeInput): Promise<ChargeResult> {
    // Guard rails, not business rules: a non-positive or non-integer amount
    // means an upstream calculation is wrong, and settling it would hide that.
    if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
      throw AppError.validation("Payment amount must be a positive integer number of paise", {
        amountPaise: input.amountPaise,
      });
    }

    const digest = createHash("sha256")
      .update(`${input.idempotencyKey}:${input.amountPaise}:${input.currency}`)
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();

    return Promise.resolve({ providerReference: `SIM-${digest}` });
  }
}
