"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FilterIcon, GridIcon, PlusIcon, TableIcon } from "@/components/ui/Icons";
import {
  categoryChanged,
  filtersReset,
  pageChanged,
  searchChanged,
  selectActiveFilterCount,
  selectFilters,
  sortChanged,
} from "@/features/products/filtersSlice";
import { useUrlFiltersSync } from "@/features/products/hooks/useUrlFiltersSync";
import { filterDrawerOpened, selectViewMode, viewModeChanged, type ViewMode } from "@/features/ui/uiSlice";
import { VIEW_MODE_STORAGE_KEY } from "@/store/listeners";
import { getErrorMessage } from "@/lib/api/errors";
import { useDeleteProductMutation, useGetCategoriesQuery, useGetProductsQuery } from "@/lib/api/productsApi";
import type { Product } from "@/lib/api/types";
import { getTotalPages } from "@/lib/filters/productQuery";
import { DEFAULT_FILTERS, SORT_LABELS } from "@/lib/filters/types";
import { cn } from "@/lib/utils/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { DeleteProductDialog } from "./DeleteProductDialog";
import { CategorySelect, SortSelect } from "./FilterControls";
import { FilterDrawer } from "./FilterDrawer";
import { Pagination } from "./Pagination";
import { ProductGrid } from "./ProductGrid";
import { ProductsSkeleton } from "./ProductsSkeleton";
import { ProductTable } from "./ProductTable";
import { SearchInput } from "./SearchInput";
import { EmptyState, ErrorState } from "./States";

// The edit form (React Hook Form + Yup) is only needed after a click: split it out.
const EditProductDialog = dynamic(() => import("./EditProductDialog"), { ssr: false });

function ViewToggle() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector(selectViewMode);
  const options: Array<{ value: ViewMode; label: string; icon: typeof TableIcon }> = [
    { value: "table", label: "Table view", icon: TableIcon },
    { value: "grid", label: "Card view", icon: GridIcon },
  ];
  return (
    <div role="group" aria-label="Layout" className="inline-flex rounded-lg bg-slate-100 p-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={viewMode === value}
          onClick={() => dispatch(viewModeChanged(value))}
          className={cn(
            "grid h-8 w-9 place-items-center rounded-md transition",
            viewMode === value ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function ActiveFilterChips() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  const { data: categories } = useGetCategoriesQuery();
  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filters.search) chips.push({ key: "search", label: `“${filters.search}”`, clear: () => dispatch(searchChanged("")) });
  if (filters.category) {
    const name = categories?.find((item) => item.slug === filters.category)?.name ?? filters.category;
    chips.push({ key: "category", label: name, clear: () => dispatch(categoryChanged("")) });
  }
  if (filters.sort !== DEFAULT_FILTERS.sort) {
    chips.push({ key: "sort", label: SORT_LABELS[filters.sort], clear: () => dispatch(sortChanged(DEFAULT_FILTERS.sort)) });
  }
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.clear}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 ring-inset hover:bg-brand-100"
          >
            {chip.label}
            <span aria-hidden>×</span>
          </button>
        </li>
      ))}
      <li>
        <button type="button" onClick={() => dispatch(filtersReset())} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          Clear all
        </button>
      </li>
    </ul>
  );
}

export function ProductsDirectory() {
  const dispatch = useAppDispatch();
  const hydrated = useUrlFiltersSync();
  const filters = useAppSelector(selectFilters);
  const viewMode = useAppSelector(selectViewMode);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);

  const { currentData, data, error, isFetching, isError, refetch } = useGetProductsQuery(filters, { skip: !hydrated });
  const [deleteProduct] = useDeleteProductMutation();

  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  // Restore the preferred layout once on the client.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === "grid" || stored === "table") dispatch(viewModeChanged(stored));
    } catch {
      // ignore
    }
  }, [dispatch]);

  // If the requested page no longer exists (shared link, deletions), clamp to the last page.
  const total = currentData?.total;
  useEffect(() => {
    if (total === undefined || total === 0) return;
    const lastPage = getTotalPages(total);
    if (filters.page > lastPage) dispatch(pageChanged(lastPage));
  }, [dispatch, filters.page, total]);

  const onEdit = useCallback((product: Product) => setEditing(product), []);
  const onDelete = useCallback((product: Product) => setDeleting(product), []);
  const confirmDelete = useCallback(
    (product: Product) => {
      setDeleting(null);
      void deleteProduct(product.id);
    },
    [deleteProduct],
  );
  const onPageChange = useCallback(
    (page: number) => {
      dispatch(pageChanged(page));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [dispatch],
  );

  // `currentData` is only defined for the *current* args, so a slow response for an
  // older query can never be rendered against the new filters.
  const products = currentData?.products;
  const showSkeleton = !hydrated || (isFetching && !currentData);

  let content: ReactNode;
  if (isError && !currentData) {
    content = <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  } else if (showSkeleton || !products) {
    content = <ProductsSkeleton viewMode={viewMode} />;
  } else if (products.length === 0) {
    content = <EmptyState search={filters.search} onReset={() => dispatch(filtersReset())} />;
  } else {
    content = (
      <div className="space-y-4">
        {viewMode === "grid" ? (
          <ProductGrid products={products} onEdit={onEdit} onDelete={onDelete} />
        ) : (
          <ProductTable products={products} onEdit={onEdit} onDelete={onDelete} />
        )}
        <Pagination page={filters.page} total={currentData.total} onPageChange={onPageChange} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `${data.total} products` : "Browse, filter and manage your catalogue."}
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <PlusIcon className="size-4" />
          New product
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="min-w-0 flex-1">
          <SearchInput isSearching={isFetching && filters.search !== ""} />
        </div>
        <Button
          variant="secondary"
          className="relative px-3 md:hidden"
          onClick={() => dispatch(filterDrawerOpened())}
          leftIcon={<FilterIcon className="size-4" />}
          aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : "Filters"}
        >
          <span className="hidden min-[400px]:inline">Filters</span>
          {activeFilterCount > 0 ? (
            <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
        <CategorySelect className="hidden w-48 md:block" />
        <SortSelect className="hidden w-48 md:block" />
        <ViewToggle />
      </div>

      <ActiveFilterChips />

      <section aria-label="Products" aria-busy={isFetching} className={cn("transition-opacity", isFetching && currentData && "opacity-60")}>
        {content}
      </section>

      <FilterDrawer resultCount={currentData?.total} />
      {editing ? <EditProductDialog product={editing} onClose={() => setEditing(null)} /> : null}
      <DeleteProductDialog product={deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
    </div>
  );
}
