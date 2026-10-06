"use client";

import { useFormContext } from "react-hook-form";
import { Field, SelectInput, TextArea, TextInput, describedBy } from "@/components/form/fields";
import type { ProductWizardFormValues } from "@/features/wizard/schemas/formTypes";
import { useGetCategoriesQuery } from "@/lib/api/productsApi";

export function BasicInfoStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductWizardFormValues>();
  const { data: categories = [], isLoading, isError } = useGetCategoriesQuery();

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field id="title" label="Product title" required error={errors.title?.message} hint="3–100 characters" className="sm:col-span-2">
        <TextInput
          id="title"
          placeholder="e.g. Wireless Noise-Cancelling Headphones"
          invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title", errors.title?.message, "3–100 characters")}
          {...register("title")}
        />
      </Field>
      <Field id="brand" label="Brand" required error={errors.brand?.message}>
        <TextInput
          id="brand"
          placeholder="e.g. Acme"
          invalid={Boolean(errors.brand)}
          aria-describedby={describedBy("brand", errors.brand?.message)}
          {...register("brand")}
        />
      </Field>
      <Field id="category" label="Category" required error={errors.category?.message}>
        <SelectInput
          id="category"
          invalid={Boolean(errors.category)}
          disabled={isLoading}
          aria-describedby={describedBy("category", errors.category?.message)}
          {...register("category")}
        >
          <option value="">{isLoading ? "Loading categories…" : isError ? "Categories unavailable" : "Select a category"}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field
        id="description"
        label="Description"
        required
        error={errors.description?.message}
        hint="At least 20 characters"
        className="sm:col-span-2"
      >
        <TextArea
          id="description"
          rows={5}
          placeholder="Describe the product, its materials and key selling points…"
          invalid={Boolean(errors.description)}
          aria-describedby={describedBy("description", errors.description?.message, "At least 20 characters")}
          {...register("description")}
        />
      </Field>
    </div>
  );
}
