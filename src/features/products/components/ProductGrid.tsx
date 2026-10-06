"use client";

import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/Button";
import { PencilIcon, TrashIcon } from "@/components/ui/Icons";
import { selectOptimisticEntry } from "@/features/products/optimisticSlice";
import type { Product } from "@/lib/api/types";
import { cn, formatCurrency, formatPercent, getDiscountedPrice, humanizeSlug } from "@/lib/utils/format";
import { useAppSelector } from "@/store/hooks";
import { ProductThumbnail, Rating, SavingIndicator, StockBadge } from "./ProductBits";
import type { ProductActions } from "./ProductTable";

const ProductCard = memo(function ProductCard({ product, onEdit, onDelete }: { product: Product } & ProductActions) {
  const pending = useAppSelector((state) => selectOptimisticEntry(state, product.id)?.status === "pending");
  const discounted = getDiscountedPrice(product.price, product.discountPercentage);
  return (
    <li
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md",
        pending && "opacity-70",
      )}
    >
      <div className="relative">
        <ProductThumbnail
          src={product.thumbnail}
          alt=""
          sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 100vw"
          className="aspect-[4/3] w-full"
        />
        {product.discountPercentage > 0 ? (
          <span className="absolute top-3 left-3 rounded-full bg-slate-900/80 px-2 py-0.5 text-xs font-semibold text-white">
            −{formatPercent(product.discountPercentage)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{humanizeSlug(product.category)}</span>
          {pending ? <SavingIndicator /> : <Rating value={product.rating} />}
        </div>
        <Link href={`/products/${product.id}`} className="line-clamp-2 font-medium text-slate-900 hover:text-brand-700">
          {product.title}
        </Link>
        <p className="text-xs text-slate-500">{product.brand ?? "Unbranded"}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-lg font-semibold text-slate-900 tabular-nums">{formatCurrency(discounted)}</p>
            {product.discountPercentage > 0 ? (
              <p className="text-xs text-slate-400 tabular-nums line-through">{formatCurrency(product.price)}</p>
            ) : null}
          </div>
          <StockBadge stock={product.stock} />
        </div>
        <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            leftIcon={<PencilIcon className="size-3.5" />}
            onClick={() => onEdit(product)}
            aria-label={`Edit ${product.title}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            leftIcon={<TrashIcon className="size-3.5" />}
            onClick={() => onDelete(product)}
            aria-label={`Delete ${product.title}`}
          >
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
});

export function ProductGrid({ products, onEdit, onDelete }: { products: Product[] } & ProductActions) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}
