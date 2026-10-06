"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Field, TextInput, describedBy, toNullableNumber } from "@/components/form/fields";
import type { ProductWizardFormValues } from "@/features/wizard/schemas/formTypes";
import { formatCurrency, getDiscountedPrice } from "@/lib/utils/format";
import { VariationsField } from "./VariationsField";

function PricePreview() {
  const { control } = useFormContext<ProductWizardFormValues>();
  const [price, discount] = useWatch({ control, name: ["price", "discountPercentage"] });
  if (typeof price !== "number" || price <= 0) return null;
  const valid = discount === null || (discount >= 0 && discount <= 99);
  return (
    <p className="text-sm text-slate-600 sm:col-span-3">
      Customer price:{" "}
      <span className="font-semibold text-slate-900 tabular-nums">
        {formatCurrency(valid ? getDiscountedPrice(price, discount) : price)}
      </span>
    </p>
  );
}

export function PricingStep() {
  const {
    register,
    control,
    getValues,
    trigger,
    formState: { errors },
  } = useFormContext<ProductWizardFormValues>();
  const numberOptions = { setValueAs: toNullableNumber };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field id="price" label="Base price (USD)" required error={errors.price?.message}>
          <TextInput
            id="price"
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            placeholder="0.00"
            invalid={Boolean(errors.price)}
            aria-describedby={describedBy("price", errors.price?.message)}
            {...register("price", numberOptions)}
          />
        </Field>
        <Field id="stock" label="Stock quantity" required error={errors.stock?.message}>
          <TextInput
            id="stock"
            type="number"
            step="1"
            min={0}
            inputMode="numeric"
            placeholder="0"
            invalid={Boolean(errors.stock)}
            aria-describedby={describedBy("stock", errors.stock?.message)}
            {...register("stock", numberOptions)}
          />
        </Field>
        <Field id="discountPercentage" label="Discount (%)" error={errors.discountPercentage?.message} hint="Optional, 0–99">
          <TextInput
            id="discountPercentage"
            type="number"
            step="0.01"
            min={0}
            max={99}
            placeholder="0"
            invalid={Boolean(errors.discountPercentage)}
            aria-describedby={describedBy("discountPercentage", errors.discountPercentage?.message, "Optional, 0–99")}
            {...register("discountPercentage", numberOptions)}
          />
        </Field>
        <PricePreview />
      </div>
      <VariationsField control={control} register={register} getValues={getValues} trigger={trigger} />
    </div>
  );
}
