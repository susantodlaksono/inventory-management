import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "@/lib/filters/types";
import filtersSlice, {
  categoryChanged,
  filtersHydrated,
  filtersReset,
  pageChanged,
  searchChanged,
  selectActiveFilterCount,
  selectFilters,
  sortChanged,
  urlSyncStopped,
  type FiltersState,
} from "../filtersSlice";

const reducer = filtersSlice.reducer;
const initial = reducer(undefined, { type: "@@init" });
const onPage3: FiltersState = { ...initial, search: "phone", category: "smartphones", sort: "price_desc", page: 3 };

describe("filtersSlice reducers", () => {
  it("starts with default filters and not hydrated", () => {
    expect(initial).toEqual({ ...DEFAULT_FILTERS, isHydrated: false });
  });

  it.each([
    ["search", searchChanged("laptop")],
    ["category", categoryChanged("laptops")],
    ["sort", sortChanged("title_asc")],
  ])("resets to page 1 when %s changes", (_name, action) => {
    expect(reducer(onPage3, action).page).toBe(1);
  });

  it("normalises the search term and ignores no-op changes", () => {
    expect(reducer(initial, searchChanged("  phone  ")).search).toBe("phone");
    expect(reducer(onPage3, searchChanged(" phone "))).toBe(onPage3);
    expect(reducer(onPage3, categoryChanged("smartphones"))).toBe(onPage3);
    expect(reducer(onPage3, sortChanged("price_desc"))).toBe(onPage3);
  });

  it("ignores invalid sort options and pages", () => {
    expect(reducer(onPage3, sortChanged("nope" as never))).toBe(onPage3);
    expect(reducer(onPage3, pageChanged(0)).page).toBe(3);
    expect(reducer(onPage3, pageChanged(Number.NaN)).page).toBe(3);
    expect(reducer(onPage3, pageChanged(5.7)).page).toBe(5);
  });

  it("hydrates from the URL and marks the state as hydrated", () => {
    const next = reducer(initial, filtersHydrated({ search: "a", category: "b", sort: "rating_desc", page: 2 }));
    expect(next).toEqual({ search: "a", category: "b", sort: "rating_desc", page: 2, isHydrated: true });
  });

  it("only flips the hydrated flag when the URL matches the current state", () => {
    const next = reducer(initial, filtersHydrated(DEFAULT_FILTERS));
    expect(next).toEqual({ ...DEFAULT_FILTERS, isHydrated: true });
    expect(reducer(next, urlSyncStopped()).isHydrated).toBe(false);
  });

  it("resets filters but keeps the hydration flag", () => {
    const hydrated = { ...onPage3, isHydrated: true };
    expect(reducer(hydrated, filtersReset())).toEqual({ ...DEFAULT_FILTERS, isHydrated: true });
  });
});

describe("filtersSlice selectors", () => {
  const root = { filters: onPage3 };

  it("returns a memoised plain filter object (the cache key)", () => {
    const first = selectFilters(root);
    expect(first).toEqual({ search: "phone", category: "smartphones", sort: "price_desc", page: 3 });
    expect(selectFilters({ filters: { ...onPage3, isHydrated: true } })).toEqual(first);
    expect(selectFilters(root)).toBe(first);
  });

  it("counts active filters", () => {
    expect(selectActiveFilterCount(root)).toBe(3);
    expect(selectActiveFilterCount({ filters: initial })).toBe(0);
  });
});
