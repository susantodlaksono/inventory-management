import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { filtersEqual, isSortOption, normalizeSearch } from "@/lib/filters/urlState";
import { DEFAULT_FILTERS, type ProductFilters, type SortOption } from "@/lib/filters/types";

export type FiltersState = ProductFilters;

const initialState: FiltersState = { ...DEFAULT_FILTERS };

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
      if (filtersEqual(state, action.payload)) return state;
      return { ...action.payload };
    },
    filtersReset() {
      return { ...DEFAULT_FILTERS };
    },
  },
  selectors: {
    selectFilters: (state) => state,
    selectSearch: (state) => state.search,
    selectCategory: (state) => state.category,
    selectSort: (state) => state.sort,
    selectPage: (state) => state.page,
    selectActiveFilterCount: (state) =>
      [state.search !== "", state.category !== "", state.sort !== DEFAULT_FILTERS.sort].filter(Boolean).length,
  },
});

export const { searchChanged, categoryChanged, sortChanged, pageChanged, filtersHydrated, filtersReset } =
  filtersSlice.actions;
export const { selectFilters, selectSearch, selectCategory, selectSort, selectPage, selectActiveFilterCount } =
  filtersSlice.selectors;
export default filtersSlice;
