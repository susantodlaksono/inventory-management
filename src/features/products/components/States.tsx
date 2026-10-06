import { Button } from "@/components/ui/Button";
import { AlertIcon, SearchIcon } from "@/components/ui/Icons";

export function EmptyState({ search, onReset }: { search: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <SearchIcon className="size-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">No products found</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {search ? (
          <>
            Nothing matches <span className="font-medium text-slate-700">“{search}”</span> with the current filters.
          </>
        ) : (
          "No products match the current filters."
        )}{" "}
        Try a different keyword or clear your filters.
      </p>
      <Button variant="secondary" className="mt-6" onClick={onReset}>
        Clear all filters
      </Button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl bg-rose-50 px-6 py-14 text-center ring-1 ring-rose-200">
      <span className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-600">
        <AlertIcon className="size-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-rose-900">Could not load products</h2>
      <p className="mt-1 max-w-sm text-sm text-rose-700">{message}</p>
      <Button variant="secondary" className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
