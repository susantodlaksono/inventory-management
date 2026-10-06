const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function getDiscountedPrice(price: number, discountPercentage: number | null | undefined): number {
  const discount = discountPercentage ?? 0;
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

export type StockLevel = "out" | "low" | "in";

export function getStockLevel(stock: number, lowThreshold = 10): StockLevel {
  if (stock <= 0) return "out";
  if (stock < lowThreshold) return "low";
  return "in";
}

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type ClassValue = string | false | null | undefined;

/** Tiny className joiner (no third-party dependency). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
