import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "../types";
import {
  buildProductsHref,
  filtersEqual,
  isSortOption,
  parseFiltersFromSearchParams,
  parsePage,
  serializeFilters,
} from "../urlState";

describe("parseFiltersFromSearchParams", () => {
  it("parses a full query string", () => {
    expect(parseFiltersFromSearchParams("search=phone&category=smartphones&sort=price_desc&page=2")).toEqual({
      search: "phone",
      category: "smartphones",
      sort: "price_desc",
      page: 2,
    });
  });

  it("accepts URLSearchParams and Next.js searchParams records", () => {
    expect(parseFiltersFromSearchParams(new URLSearchParams("page=3")).page).toBe(3);
    expect(parseFiltersFromSearchParams({ search: ["laptop", "ignored"], sort: "title_asc" })).toMatchObject({
      search: "laptop",
      sort: "title_asc",
    });
  });

  it("falls back to defaults for invalid or missing values", () => {
    expect(parseFiltersFromSearchParams("sort=bogus&page=-4")).toEqual(DEFAULT_FILTERS);
    expect(parseFiltersFromSearchParams("")).toEqual(DEFAULT_FILTERS);
    expect(parseFiltersFromSearchParams({})).toEqual(DEFAULT_FILTERS);
  });

  it("trims and caps the search term", () => {
    expect(parseFiltersFromSearchParams(`search=${"a".repeat(150)}`).search).toHaveLength(100);
    expect(parseFiltersFromSearchParams("search=%20%20phone%20").search).toBe("phone");
  });
});

describe("parsePage", () => {
  it.each([
    [undefined, 1],
    ["", 1],
    ["0", 1],
    ["abc", 1],
    ["7", 7],
    ["2.9", 2],
  ])("parsePage(%s) = %s", (input, expected) => {
    expect(parsePage(input)).toBe(expected);
  });
});

describe("serializeFilters", () => {
  it("omits defaults and uses a stable key order", () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe("");
    expect(serializeFilters({ page: 2, sort: "price_desc", category: "smartphones", search: "phone" })).toBe(
      "search=phone&category=smartphones&sort=price_desc&page=2",
    );
  });

  it("round-trips through the parser", () => {
    const filters = { search: "red shoes", category: "mens-shoes", sort: "rating_desc" as const, page: 4 };
    expect(parseFiltersFromSearchParams(serializeFilters(filters))).toEqual(filters);
  });
});

describe("helpers", () => {
  it("compares filters by value", () => {
    expect(filtersEqual(DEFAULT_FILTERS, { ...DEFAULT_FILTERS })).toBe(true);
    expect(filtersEqual(DEFAULT_FILTERS, { ...DEFAULT_FILTERS, page: 2 })).toBe(false);
  });

  it("validates sort options", () => {
    expect(isSortOption("price_asc")).toBe(true);
    expect(isSortOption("price")).toBe(false);
    expect(isSortOption(undefined)).toBe(false);
  });

  it("builds hrefs", () => {
    expect(buildProductsHref("/products", DEFAULT_FILTERS)).toBe("/products");
    expect(buildProductsHref("/products", { ...DEFAULT_FILTERS, page: 2 })).toBe("/products?page=2");
  });
});
