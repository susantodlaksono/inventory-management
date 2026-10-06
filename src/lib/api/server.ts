import "server-only";
import { API_BASE_URL } from "./baseQuery";
import { isProduct } from "./guards";
import type { Product } from "./types";

/**
 * Server-side fetch for the product detail page. Uses the Next.js data cache with
 * time-based revalidation so repeat visits are served from cache.
 */
export async function fetchProductById(id: number): Promise<Product | null> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, { next: { revalidate: 3600 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load product ${id} (status ${response.status})`);
  const data: unknown = await response.json();
  return isProduct(data) ? data : null;
}
