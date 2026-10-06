import type { Product, ProductsResponse } from "@/lib/api/types";
import { PAGE_SIZE, type ProductFilters, type SortOption } from "./types";

type SortField = Extract<keyof Product, "price" | "title" | "rating" | "stock">;

export const SORT_PARAMS: Record<Exclude<SortOption, "relevance">, { sortBy: SortField; order: "asc" | "desc" }> = {
  price_asc: { sortBy: "price", order: "asc" },
  price_desc: { sortBy: "price", order: "desc" },
  title_asc: { sortBy: "title", order: "asc" },
  title_desc: { sortBy: "title", order: "desc" },
  rating_desc: { sortBy: "rating", order: "desc" },
  stock_asc: { sortBy: "stock", order: "asc" },
};

/** Only request the fields the directory renders to keep payloads small. */
export const LIST_SELECT_FIELDS = [
  "title",
  "description",
  "category",
  "price",
  "discountPercentage",
  "rating",
  "stock",
  "brand",
  "sku",
  "thumbnail",
  "availabilityStatus",
].join(",");

export interface ProductsRequest {
  url: string;
  params: Record<string, string | number>;
  /**
   * DummyJSON cannot combine full-text search with a category filter, so in that case
   * we fetch every search hit and filter + paginate on the client.
   */
  clientSidePaging: boolean;
}

export function getSkip(page: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(0, (page - 1) * pageSize);
}

export function buildProductsRequest(filters: ProductFilters, pageSize: number = PAGE_SIZE): ProductsRequest {
  const sortParams = filters.sort === "relevance" ? {} : SORT_PARAMS[filters.sort];
  const paging = { limit: pageSize, skip: getSkip(filters.page, pageSize) };
  const select = { select: LIST_SELECT_FIELDS };

  if (filters.search && filters.category) {
    return {
      url: "/products/search",
      params: { q: filters.search, limit: 0, ...sortParams, ...select },
      clientSidePaging: true,
    };
  }
  if (filters.search) {
    return { url: "/products/search", params: { q: filters.search, ...paging, ...sortParams, ...select }, clientSidePaging: false };
  }
  if (filters.category) {
    return {
      url: `/products/category/${encodeURIComponent(filters.category)}`,
      params: { ...paging, ...sortParams, ...select },
      clientSidePaging: false,
    };
  }
  return { url: "/products", params: { ...paging, ...sortParams, ...select }, clientSidePaging: false };
}

export function applyClientSidePaging(
  response: ProductsResponse,
  filters: ProductFilters,
  pageSize: number = PAGE_SIZE,
): ProductsResponse {
  const matching = filters.category
    ? response.products.filter((product) => product.category === filters.category)
    : response.products;
  const skip = getSkip(filters.page, pageSize);
  return {
    products: matching.slice(skip, skip + pageSize),
    total: matching.length,
    skip,
    limit: pageSize,
  };
}

export function getTotalPages(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Builds a fixed-width page list with ellipses so the control never jumps around, e.g.
 * page 1 of 20 → [1, 2, 3, 4, 5, "ellipsis", 20]; page 10 → [1, "ellipsis", 9, 10, 11, "ellipsis", 20].
 */
export function getPaginationRange(current: number, totalPages: number, siblings = 1): Array<number | "ellipsis"> {
  const totalSlots = siblings * 2 + 5; // first, last, current, 2 ellipses + siblings
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const edgeCount = totalSlots - 2; // pages shown next to a single ellipsis
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, totalPages);
  const showLeftEllipsis = left > 3;
  const showRightEllipsis = right < totalPages - 2;

  if (!showLeftEllipsis) return [...range(1, edgeCount), "ellipsis", totalPages];
  if (!showRightEllipsis) return [1, "ellipsis", ...range(totalPages - edgeCount + 1, totalPages)];
  return [1, "ellipsis", ...range(left, right), "ellipsis", totalPages];
}
