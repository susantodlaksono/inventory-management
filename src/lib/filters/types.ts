export const SORT_OPTIONS = [
  "relevance",
  "price_asc",
  "price_desc",
  "title_asc",
  "title_desc",
  "rating_desc",
  "stock_asc",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  title_asc: "Name: A to Z",
  title_desc: "Name: Z to A",
  rating_desc: "Top rated",
  stock_asc: "Lowest stock",
};

export interface ProductFilters {
  search: string;
  category: string;
  sort: SortOption;
  page: number;
}

export const PAGE_SIZE = 10;
export const MAX_SEARCH_LENGTH = 100;

export const DEFAULT_FILTERS: ProductFilters = {
  search: "",
  category: "",
  sort: "relevance",
  page: 1,
};
