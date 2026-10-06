import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { filtersEqual, isSortOption, normalizeSearch } from "@/lib/filters/urlState";
import { DEFAULT_FILTERS, type ProductFilters, type SortOption } from "@/lib/filters/types";

export interface FiltersState extends ProductFilters {
  /**
   * True once the mounted directory has copied the URL into Redux. Reset on unmount so a
   * later visit never pushes stale filters into the URL before reading it.
   */
  isHydrated: boolean;
}

const initialState: FiltersState = { ...DEFAULT_FILTERS, isHydrated: false };

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    searchChanged(state, action: PayloadAction<string>) {
      const search = normalizeSearch(action.payload);
      if (search === state.search) return;
      state.search = search;
      state.page = 1;
    },
    categoryChanged(state, action: PayloadAction<string>) {
      if (action.payload === state.category) return;
      state.category = action.payload;
      state.page = 1;
    },
    sortChanged(state, action: PayloadAction<SortOption>) {
      if (!isSortOption(action.payload) || action.payload === state.sort) return;
      state.sort = action.payload;
      state.page = 1;
    },
    pageChanged(state, action: PayloadAction<number>) {
      const page = Math.floor(action.payload);
      if (Number.isFinite(page) && page >= 1) state.page = page;
    },
    /** Replaces the whole filter state, e.g. when hydrating from the URL on load / back navigation. */
    filtersHydrated(state, action: PayloadAction<ProductFilters>) {
      state.isHydrated = true;
      if (filtersEqual(state, action.payload)) return;
      const { search, category, sort, page } = action.payload;
      Object.assign(state, { search, category, sort, page });
    },
    urlSyncStopped(state) {
      state.isHydrated = false;
    },
    filtersReset(state) {
      Object.assign(state, DEFAULT_FILTERS);
    },
  },
  selectors: {
    /** Memoised plain filter object: this exact shape is the RTK Query cache key. */
    selectFilters: createSelector(
      [
        (state: FiltersState) => state.search,
        (state: FiltersState) => state.category,
        (state: FiltersState) => state.sort,
        (state: FiltersState) => state.page,
      ],
      (search, category, sort, page): ProductFilters => ({ search, category, sort, page }),
    ),
    selectIsHydrated: (state) => state.isHydrated,
    selectSearch: (state) => state.search,
    selectCategory: (state) => state.category,
    selectSort: (state) => state.sort,
    selectPage: (state) => state.page,
    selectActiveFilterCount: (state) =>
      [state.search !== "", state.category !== "", state.sort !== DEFAULT_FILTERS.sort].filter(Boolean).length,
  },
});

export const { searchChanged, categoryChanged, sortChanged, pageChanged, filtersHydrated, urlSyncStopped, filtersReset } =
  filtersSlice.actions;
export const { selectFilters, selectIsHydrated, selectSearch, selectCategory, selectSort, selectPage, selectActiveFilterCount } =
  filtersSlice.selectors;
export default filtersSlice;
