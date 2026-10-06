import type { ProductWizardValues } from "./productSchema";

/**
 * Raw form values as held by React Hook Form. Number inputs are `null` while empty,
 * which keeps the shape JSON-serialisable for draft persistence.
 */
export interface VariationFormValues {
  color: string;
  size: string;
  sku: string;
  extraPrice: number | null;
}

export interface ProductWizardFormValues {
  title: string;
  brand: string;
  category: string;
  description: string;
  price: number | null;
  stock: number | null;
  discountPercentage: number | null;
  variations: VariationFormValues[];
  weight: number | null;
  dimensions: { width: number | null; height: number | null; depth: number | null };
  fragile: boolean;
  hazardousDisclaimer: boolean;
  shippingNotes: string;
}

export const EMPTY_VARIATION: VariationFormValues = { color: "", size: "", sku: "", extraPrice: 0 };

export const DEFAULT_WIZARD_VALUES: ProductWizardFormValues = {
  title: "",
  brand: "",
  category: "",
  description: "",
  price: null,
  stock: null,
  discountPercentage: null,
  variations: [],
  weight: null,
  dimensions: { width: null, height: null, depth: null },
  fragile: false,
  hazardousDisclaimer: false,
  shippingNotes: "",
};

export const WIZARD_STEPS = [
  { id: 1, title: "Basic info", description: "Title, brand & category" },
  { id: 2, title: "Pricing & variations", description: "Price, stock & SKUs" },
  { id: 3, title: "Shipping", description: "Weight, size & handling" },
  { id: 4, title: "Review", description: "Confirm & submit" },
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number]["id"];
export const LAST_STEP: WizardStep = 4;

type FieldName = keyof ProductWizardFormValues;

/** Fields validated before leaving each step (React Hook Form `trigger`). */
export const STEP_FIELDS: Record<Exclude<WizardStep, 4>, FieldName[]> = {
  1: ["title", "brand", "category", "description"],
  2: ["price", "stock", "discountPercentage", "variations"],
  3: ["weight", "dimensions", "fragile", "hazardousDisclaimer", "shippingNotes"],
};

export function isWizardStep(value: unknown): value is WizardStep {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export type { ProductWizardValues };
