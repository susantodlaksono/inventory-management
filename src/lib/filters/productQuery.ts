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

/** Builds a compact page list with ellipses, e.g. [1, "…", 4, 5, 6, "…", 20]. */
export function getPaginationRange(current: number, totalPages: number, siblings = 1): Array<number | "ellipsis"> {
  const totalSlots = siblings * 2 + 5;
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const left = Math.max(current - siblings, 2);
  const right = Math.min(current + siblings, totalPages - 1);
  const range: Array<number | "ellipsis"> = [1];
  if (left > 2) range.push("ellipsis");
  for (let page = left; page <= right; page += 1) range.push(page);
  if (right < totalPages - 1) range.push("ellipsis");
  range.push(totalPages);
  return range;
}
