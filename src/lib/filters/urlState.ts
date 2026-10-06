import { DEFAULT_FILTERS, MAX_SEARCH_LENGTH, SORT_OPTIONS, type ProductFilters, type SortOption } from "./types";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;
type SearchParamsInput = URLSearchParams | SearchParamsRecord | string;

function readParam(input: SearchParamsInput, key: string): string | undefined {
  if (typeof input === "string") return new URLSearchParams(input).get(key) ?? undefined;
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

export function isSortOption(value: unknown): value is SortOption {
  return typeof value === "string" && (SORT_OPTIONS as readonly string[]).includes(value);
}

export function parsePage(value: string | undefined): number {
  if (!value) return DEFAULT_FILTERS.page;
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page >= 1 ? page : DEFAULT_FILTERS.page;
}

export function normalizeSearch(value: string | undefined): string {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
}

/** Parses (and sanitises) filters from URL query parameters. Unknown values fall back to defaults. */
export function parseFiltersFromSearchParams(input: SearchParamsInput): ProductFilters {
  const sort = readParam(input, "sort");
  return {
    search: normalizeSearch(readParam(input, "search")),
    category: (readParam(input, "category") ?? "").trim(),
    sort: isSortOption(sort) ? sort : DEFAULT_FILTERS.sort,
    page: parsePage(readParam(input, "page")),
  };
}

/** Serialises filters into a canonical query string (defaults omitted, stable key order). */
export function serializeFilters(filters: ProductFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export function filtersEqual(a: ProductFilters, b: ProductFilters): boolean {
  return a.search === b.search && a.category === b.category && a.sort === b.sort && a.page === b.page;
}

export function buildProductsHref(pathname: string, filters: ProductFilters): string {
  const query = serializeFilters(filters);
  return query ? `${pathname}?${query}` : pathname;
}
