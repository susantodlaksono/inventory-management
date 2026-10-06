"use client";

import { useId } from "react";
import { SelectInput } from "@/components/form/fields";
import { categoryChanged, selectCategory, selectSort, sortChanged } from "@/features/products/filtersSlice";
import { useGetCategoriesQuery } from "@/lib/api/productsApi";
import { SORT_LABELS, SORT_OPTIONS } from "@/lib/filters/types";
import { isSortOption } from "@/lib/filters/urlState";
import { cn } from "@/lib/utils/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function CategorySelect({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const id = useId();
  const dispatch = useAppDispatch();
  const category = useAppSelector(selectCategory);
  const { data: categories = [], isLoading, isError } = useGetCategoriesQuery();

  return (
    <div className={className}>
      <label htmlFor={id} className={cn("mb-1.5 block text-sm font-medium text-slate-700", !showLabel && "sr-only")}>
        Category
      </label>
      <SelectInput
        id={id}
        value={category}
        disabled={isLoading}
        onChange={(event) => dispatch(categoryChanged(event.target.value))}
      >
        <option value="">{isLoading ? "Loading categories…" : isError ? "Categories unavailable" : "All categories"}</option>
        {categories.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
        {/* Keep an unknown category from the URL selectable so the control reflects reality. */}
        {category && !isLoading && !categories.some((item) => item.slug === category) ? (
          <option value={category}>{category}</option>
        ) : null}
      </SelectInput>
    </div>
  );
}

export function SortSelect({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const id = useId();
  const dispatch = useAppDispatch();
  const sort = useAppSelector(selectSort);
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("mb-1.5 block text-sm font-medium text-slate-700", !showLabel && "sr-only")}>
        Sort by
      </label>
      <SelectInput
        id={id}
        value={sort}
        onChange={(event) => {
          if (isSortOption(event.target.value)) dispatch(sortChanged(event.target.value));
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </SelectInput>
    </div>
  );
}
