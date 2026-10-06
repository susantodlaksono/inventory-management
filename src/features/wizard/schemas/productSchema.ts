import * as yup from "yup";

export const SKU_PATTERN = /^SKU-[A-Z]{3}-[0-9]{4}$/;

export const MESSAGES = {
  skuFormat: "SKU must match SKU-ABC-1234 (3 uppercase letters, 4 digits)",
  skuDuplicate: "SKU codes must be unique",
  pricePositive: "Price must be greater than 0",
  stockInteger: "Stock must be a whole number",
  stockMin: "Stock cannot be negative",
  discountRange: "Discount must be between 0 and 99",
  hazardousRequired: "You must accept the hazardous material disclaimer for fragile items",
  notesRequired: "Special shipping notes are required for fragile items",
  notesMin: "Shipping notes must be at least 10 characters",
} as const;

/** Treat empty inputs / NaN as "missing" so `required` produces a friendly message. */
const emptyToNull = (value: unknown, original: unknown): unknown =>
  original === "" || original === null || (typeof value === "number" && Number.isNaN(value)) ? null : value;

const requiredNumber = (label: string) =>
  yup
    .number()
    .transform(emptyToNull)
    .typeError(`${label} must be a number`)
    .nullable()
    .required(`${label} is required`);

const positiveNumber = (label: string) => requiredNumber(label).moreThan(0, `${label} must be greater than 0`);

/* ---------------------------------- Step 1 --------------------------------- */

export const basicInfoSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required("Product title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),
  brand: yup.string().trim().required("Brand is required"),
  category: yup.string().required("Please select a category"),
  description: yup.string().trim().required("Description is required").min(20, "Description must be at least 20 characters"),
});

/* ---------------------------------- Step 2 --------------------------------- */

export const variationSchema = yup.object({
  color: yup.string().trim().required("Color is required"),
  size: yup.string().trim().required("Size is required"),
  sku: yup.string().trim().required("SKU code is required").matches(SKU_PATTERN, MESSAGES.skuFormat),
  extraPrice: requiredNumber("Extra price").min(0, "Extra price cannot be negative"),
});

/** Returns the indexes of every variation whose SKU appeared earlier in the list. */
export function findDuplicateSkuIndexes(variations: ReadonlyArray<{ sku?: string | null } | undefined>): number[] {
  const seen = new Set<string>();
  const duplicates: number[] = [];
  variations.forEach((variation, index) => {
    const sku = variation?.sku?.trim().toUpperCase();
    if (!sku) return;
    if (seen.has(sku)) duplicates.push(index);
    else seen.add(sku);
  });
  return duplicates;
}

export const variationsSchema = yup
  .array()
  .of(variationSchema)
  .default([])
  .test("unique-sku", MESSAGES.skuDuplicate, function uniqueSku(variations) {
    const duplicates = findDuplicateSkuIndexes(variations ?? []);
    if (duplicates.length === 0) return true;
    // Attach the error to each offending SKU input instead of the array as a whole.
    return new yup.ValidationError(
      duplicates.map((index) =>
        this.createError({ path: `${this.path}[${index}].sku`, message: MESSAGES.skuDuplicate }),
      ),
    );
  });

export const pricingSchema = yup.object({
  price: positiveNumber("Base price"),
  stock: requiredNumber("Stock quantity").integer(MESSAGES.stockInteger).min(0, MESSAGES.stockMin),
  discountPercentage: yup
    .number()
    .transform(emptyToNull)
    .typeError("Discount must be a number")
    .nullable()
    .defined()
    .min(0, MESSAGES.discountRange)
    .max(99, MESSAGES.discountRange),
  variations: variationsSchema,
});

/* ---------------------------------- Step 3 --------------------------------- */

export const shippingSchema = yup.object({
  weight: positiveNumber("Weight"),
  dimensions: yup.object({
    width: positiveNumber("Width"),
    height: positiveNumber("Height"),
    depth: positiveNumber("Depth"),
  }),
  fragile: yup.boolean().defined().default(false),
  hazardousDisclaimer: yup
    .boolean()
    .defined()
    .default(false)
    .when("fragile", {
      is: true,
      then: (schema) => schema.oneOf([true], MESSAGES.hazardousRequired),
    }),
  shippingNotes: yup
    .string()
    .defined()
    .default("")
    .when("fragile", {
      is: true,
      then: (schema) => schema.trim().required(MESSAGES.notesRequired).min(10, MESSAGES.notesMin),
    }),
});

/* ------------------------------- Full wizard ------------------------------- */

export const productWizardSchema = basicInfoSchema.concat(pricingSchema).concat(shippingSchema);

export type ProductWizardValues = yup.InferType<typeof productWizardSchema>;
export type VariationValues = yup.InferType<typeof variationSchema>;
