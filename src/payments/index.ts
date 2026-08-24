import type { PaymentProvider } from "./payment.interface.js";
import { SimulatedPaymentProvider } from "./simulated.payment.js";

export type { ChargeInput, ChargeResult, PaymentProvider } from "./payment.interface.js";
export { PAYMENT_PROVIDER_NAME } from "./simulated.payment.js";

let provider: PaymentProvider | undefined;

/**
 * Lazily constructed singleton, mirroring getStorageProvider() and
 * getAIProvider(). The payment worker goes through this, so tests mock one
 * module rather than reaching into the provider class.
 */
export function getPaymentProvider(): PaymentProvider {
  provider ??= new SimulatedPaymentProvider();
  return provider;
}
