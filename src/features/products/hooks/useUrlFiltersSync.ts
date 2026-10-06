"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { filtersHydrated, selectFilters, selectIsHydrated, urlSyncStopped } from "@/features/products/filtersSlice";
import { parseFiltersFromSearchParams, serializeFilters } from "@/lib/filters/urlState";
import type { ProductFilters } from "@/lib/filters/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Two-way binding between Redux filter state and the URL query string.
 *
 *  URL → Redux: on first load, refresh, shared links and back/forward navigation.
 *  Redux → URL: whenever the user changes a filter. We use the native History API,
 *  which Next.js integrates with `useSearchParams`, so no server round-trip happens.
 *
 * The RTK Query cache is the third leg: its cache key *is* the Redux filter object,
 * so URL, Redux and cache can never disagree.
 *
 * Returns `true` once Redux has been hydrated from the URL; queries should wait for it
 * so we never fetch the default page before the requested one.
 */
export function useUrlFiltersSync(): boolean {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const filters = useAppSelector(selectFilters);
  const hydrated = useAppSelector(selectIsHydrated);
  const urlQuery = searchParams.toString();

  const urlQueryRef = useRef(urlQuery);
  useEffect(() => {
    urlQueryRef.current = urlQuery;
  }, [urlQuery]);

  // Mark the sync as stopped when the directory unmounts.
  useEffect(() => () => void dispatch(urlSyncStopped()), [dispatch]);

  // URL → Redux. The reducer is a no-op when nothing changed, so our own URL writes
  // echoing back here are harmless.
  useEffect(() => {
    dispatch(filtersHydrated(parseFiltersFromSearchParams(urlQuery)));
  }, [dispatch, urlQuery]);

  // Redux → URL.
  const previousFilters = useRef<ProductFilters | null>(null);
  useEffect(() => {
    if (!hydrated) {
      previousFilters.current = null;
      return;
    }
    const previous = previousFilters.current;
    previousFilters.current = filters;
    const nextQuery = serializeFilters(filters);
    if (nextQuery === urlQueryRef.current) return;

    const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    // Typing in the search box should not flood the history stack; other changes
    // (category, sort, pagination) are navigations worth going "back" to.
    const onlySearchChanged =
      previous !== null &&
      previous.search !== filters.search &&
      previous.category === filters.category &&
      previous.sort === filters.sort;
    if (onlySearchChanged) window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
  }, [filters, hydrated, pathname]);

  return hydrated;
}
