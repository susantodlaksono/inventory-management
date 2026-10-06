import Image from "next/image";
import { BoxIcon, StarIcon } from "@/components/ui/Icons";
import { cn, getStockLevel } from "@/lib/utils/format";

const STOCK_STYLES = {
  out: "bg-rose-50 text-rose-700 ring-rose-600/20",
  low: "bg-amber-50 text-amber-800 ring-amber-600/20",
  in: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
} as const;

export function StockBadge({ stock }: { stock: number }) {
  const level = getStockLevel(stock);
  const label = level === "out" ? "Out of stock" : level === "low" ? `Low · ${stock}` : `${stock} in stock`;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        STOCK_STYLES[level],
      )}
    >
      {label}
    </span>
  );
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-slate-600" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
      {value.toFixed(1)}
    </span>
  );
}

export function ProductThumbnail({ src, alt, className, sizes }: { src?: string; alt: string; className?: string; sizes: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-slate-100", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-contain" />
      ) : (
        <div className="grid size-full place-items-center text-slate-300">
          <BoxIcon className="size-1/2" />
        </div>
      )}
    </div>
  );
}

export function SavingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
      <span className="size-1.5 animate-pulse rounded-full bg-brand-500" />
      Saving…
    </span>
  );
}
