/**
 * Settlement boundary. Payment is simulated for the MVP (CLAUDE.md §11), but
 * every caller goes through this interface so a real gateway can replace the
 * simulator without touching the worker.
 *
 * Amounts are integer paise, never floats, and the provider is never asked to
 * decide *whether* to pay — src/rules/paymentRules.ts already made that call.
 */
export interface ChargeInput {
  /**
   * Stable across retries of the same payment (the invoice id). A real provider
   * would use it to collapse duplicate charges; the simulator derives its
   * reference from it so a replay yields the same answer.
   */
  idempotencyKey: string;
  amountPaise: number;
  currency: string;
  /** Human-readable descriptor carried onto the provider's record. */
  reference: string;
}

export interface ChargeResult {
  providerReference: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
}
