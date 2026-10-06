import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import { Rating, StockBadge } from "@/features/products/components/ProductBits";
import { fetchProductById } from "@/lib/api/server";
import { formatCurrency, formatPercent, getDiscountedPrice, humanizeSlug } from "@/lib/utils/format";

// Dedupe the fetch between generateMetadata and the page render.
const getProduct = cache(async (rawId: string) => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return fetchProductById(id);
});

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return product ? { title: product.title, description: product.description } : { title: "Product not found" };
}

export default async function ProductDetailPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const discounted = getDiscountedPrice(product.price, product.discountPercentage);
  const image = product.images?.[0] ?? product.thumbnail;
  const specs: Array<[string, string]> = [
    ["Brand", product.brand ?? "—"],
    ["Category", humanizeSlug(product.category)],
    ["SKU", product.sku ?? "—"],
    ["Weight", product.weight !== undefined ? `${product.weight} kg` : "—"],
    [
      "Dimensions",
      product.dimensions
        ? `${product.dimensions.width} × ${product.dimensions.height} × ${product.dimensions.depth} cm`
        : "—",
    ],
    ["Availability", product.availabilityStatus ?? "—"],
  ];

  return (
    <article className="space-y-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ChevronLeftIcon className="size-4" />
        Back to inventory
      </Link>
      <div className="grid gap-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
          {image ? (
            <Image src={image} alt={product.title} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-contain" />
          ) : null}
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-brand-700">{humanizeSlug(product.category)}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{product.title}</h1>
            <div className="mt-2 flex items-center gap-3">
              <Rating value={product.rating} />
              <StockBadge stock={product.stock} />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-slate-900 tabular-nums">{formatCurrency(discounted)}</span>
            {product.discountPercentage > 0 ? (
              <>
                <span className="text-slate-400 tabular-nums line-through">{formatCurrency(product.price)}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  −{formatPercent(product.discountPercentage)}
                </span>
              </>
            ) : null}
          </div>
          <p className="leading-7 text-slate-600">{product.description}</p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
            {specs.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}
