import {
  DEFAULT_WIZARD_VALUES,
  isWizardStep,
  type ProductWizardFormValues,
  type VariationFormValues,
  type WizardStep,
} from "./schemas/formTypes";

export const DRAFT_STORAGE_KEY = "inventory:product-draft:v1";

export interface PersistedDraft {
  values: ProductWizardFormValues;
  step: WizardStep;
  savedAt: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const asNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const asBoolean = (value: unknown): boolean => value === true;

function sanitizeVariation(value: unknown): VariationFormValues | null {
  if (!isRecord(value)) return null;
  return {
    color: asString(value.color),
    size: asString(value.size),
    sku: asString(value.sku),
    extraPrice: asNullableNumber(value.extraPrice),
  };
}

/** Coerces untrusted JSON (localStorage) into a well-formed set of wizard values. */
export function sanitizeDraftValues(value: unknown): ProductWizardFormValues {
  if (!isRecord(value)) return { ...DEFAULT_WIZARD_VALUES };
  const dimensions = isRecord(value.dimensions) ? value.dimensions : {};
  const variations = Array.isArray(value.variations)
    ? value.variations.map(sanitizeVariation).filter((v): v is VariationFormValues => v !== null)
    : [];
  return {
    title: asString(value.title),
    brand: asString(value.brand),
    category: asString(value.category),
    description: asString(value.description),
    price: asNullableNumber(value.price),
    stock: asNullableNumber(value.stock),
    discountPercentage: asNullableNumber(value.discountPercentage),
    variations,
    weight: asNullableNumber(value.weight),
    dimensions: {
      width: asNullableNumber(dimensions.width),
      height: asNullableNumber(dimensions.height),
      depth: asNullableNumber(dimensions.depth),
    },
    fragile: asBoolean(value.fragile),
    hazardousDisclaimer: asBoolean(value.hazardousDisclaimer),
    shippingNotes: asString(value.shippingNotes),
  };
}

export function parsePersistedDraft(raw: string | null): PersistedDraft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.savedAt !== "string") return null;
    return {
      values: sanitizeDraftValues(parsed.values),
      step: isWizardStep(parsed.step) ? parsed.step : 1,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

/** A draft is only worth offering if the user actually typed something. */
export function hasMeaningfulContent(values: ProductWizardFormValues): boolean {
  return JSON.stringify(sanitizeDraftValues(values)) !== JSON.stringify(DEFAULT_WIZARD_VALUES);
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadDraft(storage: Storage | null = getStorage()): PersistedDraft | null {
  try {
    return parsePersistedDraft(storage?.getItem(DRAFT_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function saveDraftToStorage(draft: PersistedDraft, storage: Storage | null = getStorage()): void {
  try {
    storage?.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota exceeded / private mode: drafts are a convenience, never block the user.
  }
}

export function clearDraftFromStorage(storage: Storage | null = getStorage()): void {
  try {
    storage?.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
