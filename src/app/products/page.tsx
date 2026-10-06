import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsDirectory } from "@/features/products/components/ProductsDirectory";
import { DirectoryFallback } from "@/features/products/components/ProductsSkeleton";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Search, filter and manage products.",
};

/**
 * Server Component shell. The interactive directory reads the URL with
 * `useSearchParams`, so it sits behind a Suspense boundary: the static shell is
 * prerendered and the filtered view hydrates from the query string on the client.
 */
export default function ProductsPage() {
  return (
    <Suspense fallback={<DirectoryFallback />}>
      <ProductsDirectory />
    </Suspense>
  );
}
