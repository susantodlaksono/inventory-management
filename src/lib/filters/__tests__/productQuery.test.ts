import { describe, expect, it } from "vitest";
import { makeProduct } from "@/test/fixtures";
import {
  LIST_SELECT_FIELDS,
  applyClientSidePaging,
  buildProductsRequest,
  getPaginationRange,
  getSkip,
  getTotalPages,
} from "../productQuery";
import { DEFAULT_FILTERS } from "../types";

describe("buildProductsRequest", () => {
  it("lists all products with paging", () => {
    expect(buildProductsRequest({ ...DEFAULT_FILTERS, page: 3 })).toEqual({
      url: "/products",
      params: { limit: 10, skip: 20, select: LIST_SELECT_FIELDS },
      clientSidePaging: false,
    });
  });

  it("uses the search endpoint with sort params", () => {
    expect(buildProductsRequest({ ...DEFAULT_FILTERS, search: "phone", sort: "price_desc" })).toEqual({
      url: "/products/search",
      params: { q: "phone", limit: 10, skip: 0, sortBy: "price", order: "desc", select: LIST_SELECT_FIELDS },
      clientSidePaging: false,
    });
  });

  it("uses the category endpoint and encodes the slug", () => {
    const request = buildProductsRequest({ ...DEFAULT_FILTERS, category: "home decoration", sort: "title_asc" });
    expect(request.url).toBe("/products/category/home%20decoration");
    expect(request.params).toMatchObject({ sortBy: "title", order: "asc", limit: 10, skip: 0 });
  });

  it("fetches all search hits for client-side paging when search and category are combined", () => {
    const request = buildProductsRequest({ ...DEFAULT_FILTERS, search: "phone", category: "smartphones", page: 2 });
    expect(request).toMatchObject({ url: "/products/search", clientSidePaging: true });
    expect(request.params).toMatchObject({ q: "phone", limit: 0 });
    expect(request.params).not.toHaveProperty("skip");
  });
});

describe("applyClientSidePaging", () => {
  const products = Array.from({ length: 25 }, (_, i) =>
    makeProduct({ id: i + 1, category: i % 2 === 0 ? "smartphones" : "laptops" }),
  );
  const response = { products, total: 25, skip: 0, limit: 0 };

  it("filters by category and paginates", () => {
    const page2 = applyClientSidePaging(response, { ...DEFAULT_FILTERS, search: "x", category: "smartphones", page: 2 });
    expect(page2.total).toBe(13);
    expect(page2.products.map((p) => p.id)).toEqual([21, 23, 25]);
    expect(page2).toMatchObject({ skip: 10, limit: 10 });
  });

  it("returns everything (paged) when no category is set", () => {
    const page1 = applyClientSidePaging(response, DEFAULT_FILTERS);
    expect(page1.total).toBe(25);
    expect(page1.products).toHaveLength(10);
  });
});

describe("pagination helpers", () => {
  it("computes skip and total pages", () => {
    expect(getSkip(1)).toBe(0);
    expect(getSkip(4, 5)).toBe(15);
    expect(getSkip(0)).toBe(0);
    expect(getTotalPages(0)).toBe(1);
    expect(getTotalPages(194)).toBe(20);
  });

  it("returns every page when there are few", () => {
    expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("adds ellipses around the current page", () => {
    expect(getPaginationRange(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
    expect(getPaginationRange(1, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(getPaginationRange(20, 20)).toEqual([1, "ellipsis", 19, 20]);
    expect(getPaginationRange(3, 20)).toEqual([1, 2, 3, 4, "ellipsis", 20]);
  });
});
