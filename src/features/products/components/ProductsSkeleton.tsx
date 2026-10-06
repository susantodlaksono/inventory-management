import { Skeleton } from "@/components/ui/Skeleton";
import type { ViewMode } from "@/features/ui/uiSlice";
import { PAGE_SIZE } from "@/lib/filters/types";

export function TableSkeleton({ rows = PAGE_SIZE }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200" aria-busy="true" aria-label="Loading products">
      <div className="h-10 border-b border-slate-200 bg-slate-50" />
      <ul className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-3.5 w-20 md:block" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GridSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: cards }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProductsSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return viewMode === "grid" ? <GridSkeleton /> : <TableSkeleton />;
}

/** Full-page fallback used while the client directory boundary streams in. */
export function DirectoryFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="hidden h-10 w-44 md:block" />
        <Skeleton className="hidden h-10 w-44 md:block" />
      </div>
      <TableSkeleton />
    </div>
  );
}
