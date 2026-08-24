import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  /** Monetary value in integer minor units (e.g. paise for INR: 182000 => ₹1,820.00) */
  amountPaise?: number | null;
  /** Monetary value already in major units (e.g. Rupees for INR: 1820 => ₹1,820.00) */
  amount?: number | null;
  /** ISO 4217 Currency code (defaults to "INR") */
  currency?: string;
  /** Whether to render fractional digits (.00) */
  showDecimals?: boolean;
  className?: string;
}

export function formatCurrency(
  value: number,
  currency = "INR",
  showDecimals = true
): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback if Intl currency formatting fails
    const symbol = currency.toUpperCase() === "INR" ? "₹" : `${currency} `;
    return `${symbol}${value.toLocaleString("en-IN", {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function MoneyDisplay({
  amountPaise,
  amount,
  currency = "INR",
  showDecimals = true,
  className,
}: MoneyDisplayProps) {
  // Derive value in major currency units (e.g. Rupees):
  // - amountPaise represents integer minor units (paise) -> divide by 100
  // - amount represents major units -> use directly
  let numericAmount = 0;
  if (amountPaise !== undefined && amountPaise !== null) {
    numericAmount = amountPaise / 100;
  } else if (amount !== undefined && amount !== null) {
    numericAmount = amount;
  }

  const formatted = formatCurrency(numericAmount, currency, showDecimals);

  return (
    <span className={cn("font-medium tracking-tight", className)}>
      {formatted}
    </span>
  );
}
