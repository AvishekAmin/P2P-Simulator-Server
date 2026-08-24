import { InvoiceStatus, MatchStatus, PaymentStatus } from "../generated/prisma/enums.js";

/**
 * The deterministic gate that decides whether an invoice may be settled.
 *
 * Pure — no Prisma, no I/O, no AI (CLAUDE.md rule 7: "Deterministic TypeScript
 * controls financial and business-critical decisions"). The payment worker does
 * nothing but load state, ask this function, and obey the answer, so every
 * reason money does or does not move is visible and unit-testable in one place.
 *
 * A refusal is a *business* outcome, never an error: the caller returns
 * normally rather than throwing, because retrying it would never change it.
 */

export type PaymentDecision = { payable: true } | { payable: false; reason: string };

export interface PaymentGateInput {
  invoiceStatus: InvoiceStatus;
  /** Null when the invoice has never been through three-way matching. */
  matchStatus: MatchStatus | null;
  /** Null when no Payment row exists yet. */
  paymentStatus: PaymentStatus | null;
  /** Exceptions still OPEN or UNDER_REVIEW against this invoice. */
  openExceptionCount: number;
}

/**
 * Order matters: the checks run from the most authoritative fact outwards, so
 * the reason a caller reports is the most informative one available.
 *
 * Two rules deserve explanation.
 *
 * A MISMATCHED match does not veto payment on its own. Re-running matching over
 * a genuine discrepancy would produce the same verdict forever, so a human
 * cannot clear an exception by re-matching — they clear it by *overriding* it
 * ("the supplier confirmed the short delivery, pay it"). That override is
 * recorded honestly: the ThreeWayMatch keeps saying MISMATCHED, because that is
 * what the paperwork says, and the authorization lives in the resolved
 * Exception and the invoice's own status instead.
 *
 * What actually guards the override is `openExceptionCount` combined with
 * `invoiceStatus`. Matching moves a mismatched invoice to EXCEPTION and opens at
 * least one exception; the only thing in the system that can move it back to
 * APPROVED is resolveExceptionById, which demands a written reason and writes an
 * audit row. So "APPROVED with nothing open" is not a state the workflow can
 * drift into — it is a signed decision.
 */
export function evaluatePayment(input: PaymentGateInput): PaymentDecision {
  const { invoiceStatus, matchStatus, paymentStatus, openExceptionCount } = input;

  if (invoiceStatus === InvoiceStatus.PAID) {
    return { payable: false, reason: "Invoice is already paid" };
  }

  if (invoiceStatus !== InvoiceStatus.APPROVED) {
    return { payable: false, reason: `Invoice is ${invoiceStatus}, not APPROVED` };
  }

  if (matchStatus === null) {
    return { payable: false, reason: "Invoice has not been three-way matched" };
  }

  // Belt and braces. An approved invoice should never still have an open
  // exception, but if the two ever disagree, the open exception wins.
  if (openExceptionCount > 0) {
    return {
      payable: false,
      reason: `Invoice has ${openExceptionCount} unresolved exception(s)`,
    };
  }

  if (paymentStatus === PaymentStatus.COMPLETED) {
    return { payable: false, reason: "Payment has already completed" };
  }

  // Reaching here on a MISMATCHED match means a human approved it above.
  // PENDING, PROCESSING (this job's own earlier attempt), FAILED (retryable),
  // BLOCKED (unblocked by that same approval) and null all proceed.
  return { payable: true };
}

/** True when settling this invoice overrides a failed match rather than following one. */
export function isOverriddenPayment(matchStatus: MatchStatus | null): boolean {
  return matchStatus === MatchStatus.MISMATCHED;
}
