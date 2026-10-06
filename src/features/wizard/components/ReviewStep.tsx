"use client";

import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { PencilIcon } from "@/components/ui/Icons";
import type { ProductWizardFormValues, WizardStep } from "@/features/wizard/schemas/formTypes";
import { useGetCategoriesQuery } from "@/lib/api/productsApi";
import { formatCurrency, formatPercent, getDiscountedPrice } from "@/lib/utils/format";

function Section({ title, step, onEdit, children }: { title: string; step: WizardStep; onEdit: (step: WizardStep) => void; children: ReactNode }) {
  return (
    <section className="rounded-xl ring-1 ring-slate-200">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          aria-label={`Edit ${title}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
        >
          <PencilIcon className="size-3.5" />
          Edit
        </button>
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Item({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm break-words text-slate-900">{value}</dd>
    </div>
  );
}

const money = (value: number | null) => (value === null ? "—" : formatCurrency(value));

export function ReviewStep({ onEdit }: { onEdit: (step: WizardStep) => void }) {
  const { getValues } = useFormContext<ProductWizardFormValues>();
  const { data: categories } = useGetCategoriesQuery();
  // The review is rendered once per visit; reading a snapshot avoids subscriptions.
  const values = getValues();
  const categoryName = categories?.find((item) => item.slug === values.category)?.name ?? values.category;
  const { width, height, depth } = values.dimensions;

  return (
    <div className="space-y-4">
      <Section title="Basic information" step={1} onEdit={onEdit}>
        <Item label="Title" value={values.title} />
        <Item label="Brand" value={values.brand} />
        <Item label="Category" value={categoryName} />
        <Item label="Description" value={values.description} wide />
      </Section>

      <Section title="Pricing & variations" step={2} onEdit={onEdit}>
        <Item label="Base price" value={money(values.price)} />
        <Item label="Stock" value={values.stock ?? "—"} />
        <Item label="Discount" value={values.discountPercentage === null ? "None" : formatPercent(values.discountPercentage)} />
        <Item
          label="Customer price"
          value={values.price === null ? "—" : formatCurrency(getDiscountedPrice(values.price, values.discountPercentage))}
        />
        <Item
          wide
          label={`Variations (${values.variations.length})`}
          value={
            values.variations.length === 0 ? (
              "No variations"
            ) : (
              <ul className="mt-1 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
                {values.variations.map((variation, index) => (
                  <li key={`${variation.sku}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="font-mono text-xs">{variation.sku}</span>
                    <span className="text-slate-600">
                      {variation.color} · {variation.size}
                    </span>
                    <span className="tabular-nums">+{money(variation.extraPrice)}</span>
                  </li>
                ))}
              </ul>
            )
          }
        />
      </Section>

      <Section title="Shipping" step={3} onEdit={onEdit}>
        <Item label="Weight" value={values.weight === null ? "—" : `${values.weight} kg`} />
        <Item label="Dimensions (W × H × D)" value={`${width ?? "—"} × ${height ?? "—"} × ${depth ?? "—"} cm`} />
        <Item label="Fragile handling" value={values.fragile ? "Required" : "Not required"} />
        {values.fragile ? (
          <>
            <Item label="Hazardous disclaimer" value={values.hazardousDisclaimer ? "Accepted" : "Not accepted"} />
            <Item label="Shipping notes" value={values.shippingNotes} wide />
          </>
        ) : null}
      </Section>
    </div>
  );
}
