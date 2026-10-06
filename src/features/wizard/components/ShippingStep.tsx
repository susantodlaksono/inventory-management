"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Checkbox, Field, TextArea, TextInput, describedBy, toNullableNumber } from "@/components/form/fields";
import { AlertIcon } from "@/components/ui/Icons";
import type { ProductWizardFormValues } from "@/features/wizard/schemas/formTypes";

/** Only this section subscribes to the `fragile` flag. */
function FragileHandlingSection() {
  const {
    control,
    register,
    clearErrors,
    formState: { errors },
  } = useFormContext<ProductWizardFormValues>();
  const fragile = useWatch({ control, name: "fragile" });

  useEffect(() => {
    if (!fragile) clearErrors(["hazardousDisclaimer", "shippingNotes"]);
  }, [fragile, clearErrors]);

  return (
    <fieldset className="space-y-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <legend className="sr-only">Handling</legend>
      <Checkbox
        id="fragile"
        label="Requires special fragile handling"
        description="Glass, ceramics, electronics or anything that needs extra care in transit."
        {...register("fragile")}
      />
      {fragile ? (
        <div className="space-y-4 border-t border-slate-200 pt-4" data-testid="fragile-section">
          <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            Fragile items require a hazardous material disclaimer and handling notes.
          </div>
          <div>
            <Checkbox
              id="hazardousDisclaimer"
              label="I confirm this shipment complies with the hazardous material disclaimer"
              invalid={Boolean(errors.hazardousDisclaimer)}
              aria-describedby={describedBy("hazardousDisclaimer", errors.hazardousDisclaimer?.message)}
              {...register("hazardousDisclaimer")}
            />
            {errors.hazardousDisclaimer?.message ? (
              <p id="hazardousDisclaimer-error" role="alert" className="mt-1.5 ml-7 text-xs font-medium text-rose-600">
                {errors.hazardousDisclaimer.message}
              </p>
            ) : null}
          </div>
          <Field id="shippingNotes" label="Special shipping notes" required error={errors.shippingNotes?.message} hint="At least 10 characters">
            <TextArea
              id="shippingNotes"
              rows={3}
              placeholder="e.g. Keep upright, double-box with foam inserts"
              invalid={Boolean(errors.shippingNotes)}
              aria-describedby={describedBy("shippingNotes", errors.shippingNotes?.message, "At least 10 characters")}
              {...register("shippingNotes")}
            />
          </Field>
        </div>
      ) : null}
    </fieldset>
  );
}

export function ShippingStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductWizardFormValues>();
  const numberOptions = { setValueAs: toNullableNumber };
  const dimensionErrors = errors.dimensions;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Field id="weight" label="Weight (kg)" required error={errors.weight?.message} className="col-span-2 sm:col-span-1">
          <TextInput
            id="weight"
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            invalid={Boolean(errors.weight)}
            aria-describedby={describedBy("weight", errors.weight?.message)}
            {...register("weight", numberOptions)}
          />
        </Field>
        {(["width", "height", "depth"] as const).map((dimension) => {
          const id = `dimensions-${dimension}`;
          const message = dimensionErrors?.[dimension]?.message;
          return (
            <Field key={dimension} id={id} label={`${dimension[0].toUpperCase()}${dimension.slice(1)} (cm)`} required error={message}>
              <TextInput
                id={id}
                type="number"
                step="0.1"
                min={0}
                inputMode="decimal"
                invalid={Boolean(message)}
                aria-describedby={describedBy(id, message)}
                {...register(`dimensions.${dimension}`, numberOptions)}
              />
            </Field>
          );
        })}
      </div>
      <FragileHandlingSection />
    </div>
  );
}
