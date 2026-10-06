"use client";

import Link from "next/link";
import { memo } from "react";
import { PencilIcon, TrashIcon } from "@/components/ui/Icons";
import { selectOptimisticEntry } from "@/features/products/optimisticSlice";
import type { Product } from "@/lib/api/types";
import { cn, formatCurrency, getDiscountedPrice, humanizeSlug } from "@/lib/utils/format";
import { useAppSelector } from "@/store/hooks";
import { ProductThumbnail, Rating, SavingIndicator, StockBadge } from "./ProductBits";

export interface ProductActions {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const ProductRow = memo(function ProductRow({ product, onEdit, onDelete }: { product: Product } & ProductActions) {
  const pending = useAppSelector((state) => selectOptimisticEntry(state, product.id)?.status === "pending");
  const discounted = getDiscountedPrice(product.price, product.discountPercentage);
  return (
    <tr className={cn("group transition-colors hover:bg-slate-50/70", pending && "opacity-70")}>
      {/* w-full + max-w-0 lets the title truncate instead of widening the table. */}
      <td className="w-full max-w-0 py-3 pr-3 pl-4 sm:pl-5">
        <div className="flex items-center gap-3">
          <ProductThumbnail src={product.thumbnail} alt="" sizes="48px" className="size-12 shrink-0 rounded-lg ring-1 ring-slate-200" />
          <div className="min-w-0">
            <Link href={`/products/${product.id}`} className="line-clamp-2 font-medium break-words text-slate-900 hover:text-brand-700 sm:line-clamp-1">
              {product.title}
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="truncate">{product.brand ?? "Unbranded"}</span>
              {product.sku ? <span className="hidden font-mono lg:inline">· {product.sku}</span> : null}
              {pending ? <SavingIndicator /> : null}
            </div>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-sm text-slate-600 md:table-cell">{humanizeSlug(product.category)}</td>
      <td className="px-3 py-3 text-right text-sm whitespace-nowrap">
        <div className="font-medium text-slate-900 tabular-nums">{formatCurrency(discounted)}</div>
        {product.discountPercentage > 0 ? (
          <div className="text-xs text-slate-400 tabular-nums line-through">{formatCurrency(product.price)}</div>
        ) : null}
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <StockBadge stock={product.stock} />
      </td>
      <td className="hidden px-3 py-3 lg:table-cell">
        <Rating value={product.rating} />
      </td>
      <td className="py-3 pr-4 pl-3 text-right sm:pr-5">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(product)}
            aria-label={`Edit ${product.title}`}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            aria-label={`Delete ${product.title}`}
            className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export function ProductTable({ products, onEdit, onDelete }: { products: Product[] } & ProductActions) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <th scope="col" className="py-3 pr-3 pl-4 sm:pl-5">
              Product
            </th>
            <th scope="col" className="hidden px-3 py-3 md:table-cell">
              Category
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Price
            </th>
            <th scope="col" className="hidden px-3 py-3 sm:table-cell">
              Stock
            </th>
            <th scope="col" className="hidden px-3 py-3 lg:table-cell">
              Rating
            </th>
            <th scope="col" className="py-3 pr-4 pl-3 text-right sm:pr-5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <ProductRow key={product.id} product={product} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
