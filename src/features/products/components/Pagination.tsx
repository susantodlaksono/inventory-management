import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { getPaginationRange, getTotalPages } from "@/lib/filters/productQuery";
import { PAGE_SIZE } from "@/lib/filters/types";
import { cn } from "@/lib/utils/format";

export interface PaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize = PAGE_SIZE, onPageChange }: PaginationProps) {
  const totalPages = getTotalPages(total, pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageButton = "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-medium transition-colors";

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium text-slate-900">{from}</span>–<span className="font-medium text-slate-900">{to}</span> of{" "}
        <span className="font-medium text-slate-900">{total}</span> products
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(pageButton, "text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40")}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        {getPaginationRange(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              aria-label={`Page ${item}`}
              className={cn(
                pageButton,
                item === page ? "bg-brand-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100",
                // Keep mobile compact: only show neighbours of the current page.
                Math.abs(item - page) > 1 && item !== 1 && item !== totalPages && "hidden sm:grid",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={cn(pageButton, "text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40")}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </nav>
  );
}
