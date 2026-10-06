"use client";

import { memo, useCallback } from "react";
import {
  useFieldArray,
  useFormState,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormTrigger,
} from "react-hook-form";
import { Field, TextInput, describedBy, toNullableNumber } from "@/components/form/fields";
import { Button } from "@/components/ui/Button";
import { PlusIcon, TrashIcon } from "@/components/ui/Icons";
import { EMPTY_VARIATION, type ProductWizardFormValues } from "@/features/wizard/schemas/formTypes";
import { formatCurrency } from "@/lib/utils/format";

type FormControl = Control<ProductWizardFormValues>;

/** Subscribes to just two values, so typing elsewhere never re-renders it. */
function VariationTotal({ control, index }: { control: FormControl; index: number }) {
  const [base, extra] = useWatch({ control, name: ["price", `variations.${index}.extraPrice`] });
  if (typeof base !== "number") return null;
  return (
    <p className="text-xs text-slate-500">
      Final price: <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(base + (extra ?? 0))}</span>
    </p>
  );
}

interface VariationRowProps {
  index: number;
  control: FormControl;
  register: UseFormRegister<ProductWizardFormValues>;
  onRemove: (index: number) => void;
  onSkuBlur: () => void;
}

/**
 * Memoised row: props are all referentially stable (`control`, `register`, callbacks),
 * and errors are read with a path-scoped `useFormState`, so a keystroke in one row
 * only re-renders that row.
 */
const VariationRow = memo(function VariationRow({ index, control, register, onRemove, onSkuBlur }: VariationRowProps) {
  const { errors } = useFormState({ control, name: `variations.${index}` });
  const rowErrors = errors.variations?.[index];
  const id = (field: string) => `variations-${index}-${field}`;

  return (
    <li className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200" data-testid={`variation-row-${index}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Variation {index + 1}</h4>
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label={`Remove variation ${index + 1}`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field id={id("color")} label="Color" required error={rowErrors?.color?.message}>
          <TextInput
            id={id("color")}
            placeholder="Red"
            invalid={Boolean(rowErrors?.color)}
            aria-describedby={describedBy(id("color"), rowErrors?.color?.message)}
            {...register(`variations.${index}.color`)}
          />
        </Field>
        <Field id={id("size")} label="Size" required error={rowErrors?.size?.message}>
          <TextInput
            id={id("size")}
            placeholder="M"
            invalid={Boolean(rowErrors?.size)}
            aria-describedby={describedBy(id("size"), rowErrors?.size?.message)}
            {...register(`variations.${index}.size`)}
          />
        </Field>
        <Field id={id("sku")} label="SKU code" required error={rowErrors?.sku?.message}>
          <TextInput
            id={id("sku")}
            placeholder="SKU-RED-1001"
            autoCapitalize="characters"
            className="font-mono uppercase"
            invalid={Boolean(rowErrors?.sku)}
            aria-describedby={describedBy(id("sku"), rowErrors?.sku?.message)}
            {...register(`variations.${index}.sku`, {
              setValueAs: (value: unknown) => (typeof value === "string" ? value.toUpperCase() : ""),
              onBlur: onSkuBlur,
            })}
          />
        </Field>
        <Field id={id("extraPrice")} label="Extra price" required error={rowErrors?.extraPrice?.message}>
          <TextInput
            id={id("extraPrice")}
            type="number"
            step="0.01"
            min={0}
            invalid={Boolean(rowErrors?.extraPrice)}
            aria-describedby={describedBy(id("extraPrice"), rowErrors?.extraPrice?.message)}
            {...register(`variations.${index}.extraPrice`, { setValueAs: toNullableNumber })}
          />
        </Field>
      </div>
      <div className="mt-2">
        <VariationTotal control={control} index={index} />
      </div>
    </li>
  );
});

export interface VariationsFieldProps {
  control: FormControl;
  register: UseFormRegister<ProductWizardFormValues>;
  getValues: UseFormGetValues<ProductWizardFormValues>;
  trigger: UseFormTrigger<ProductWizardFormValues>;
}

export function VariationsField({ control, register, getValues, trigger }: VariationsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "variations" });

  const onRemove = useCallback((index: number) => remove(index), [remove]);

  // Duplicate detection spans rows: when any SKU loses focus, revalidate every
  // non-empty SKU so a fixed duplicate also clears the error on its twin.
  const onSkuBlur = useCallback(() => {
    const names = getValues("variations")
      .map((variation, index) => (variation.sku ? (`variations.${index}.sku` as const) : null))
      .filter((name): name is `variations.${number}.sku` => name !== null);
    if (names.length > 0) void trigger(names);
  }, [getValues, trigger]);

  return (
    <section aria-labelledby="variations-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="variations-heading" className="text-sm font-semibold text-slate-900">
            SKU variations
          </h3>
          <p className="text-xs text-slate-500">Optional. Each SKU must follow SKU-ABC-1234 and be unique.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<PlusIcon className="size-3.5" />}
          onClick={() => append({ ...EMPTY_VARIATION }, { shouldFocus: true })}
        >
          Add variation
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          No variations yet. Add colours, sizes or other SKUs.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <VariationRow
              key={field.id}
              index={index}
              control={control}
              register={register}
              onRemove={onRemove}
              onSkuBlur={onSkuBlur}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
