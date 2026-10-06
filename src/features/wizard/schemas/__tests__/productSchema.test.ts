import { describe, expect, it } from "vitest";
import { ValidationError } from "yup";
import {
  MESSAGES,
  SKU_PATTERN,
  basicInfoSchema,
  findDuplicateSkuIndexes,
  pricingSchema,
  productWizardSchema,
  shippingSchema,
  variationSchema,
} from "../productSchema";

/**
 * Collects `{ path: message }` for every failing field (abortEarly: false), keeping the
 * first message per path, exactly like @hookform/resolvers' default `criteriaMode`.
 */
async function errorsOf(schema: { validate: (value: unknown, options: { abortEarly: boolean }) => Promise<unknown> }, value: unknown) {
  try {
    await schema.validate(value, { abortEarly: false });
    return {};
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    const errors: Record<string, string> = {};
    for (const inner of error.inner) {
      const path = inner.path ?? "";
      if (!(path in errors)) errors[path] = inner.message;
    }
    return errors;
  }
}

const validBasic = {
  title: "Wireless Headphones",
  brand: "Acme",
  category: "smartphones",
  description: "Over-ear headphones with active noise cancelling.",
};
const validPricing = { price: 120, stock: 10, discountPercentage: null, variations: [] };
const validShipping = {
  weight: 1.2,
  dimensions: { width: 20, height: 10, depth: 8 },
  fragile: false,
  hazardousDisclaimer: false,
  shippingNotes: "",
};

describe("SKU format", () => {
  it.each(["SKU-RED-1001", "SKU-ABC-0000", "SKU-XYZ-9999"])("accepts %s", (sku) => {
    expect(SKU_PATTERN.test(sku)).toBe(true);
  });

  it.each(["sku-red-1001", "SKU-RD-1001", "SKU-REDD-1001", "SKU-RED-101", "SKU-RED-10011", "SKU_RED_1001", "SKU-R3D-1001", " SKU-RED-1001x"])(
    "rejects %s",
    async (sku) => {
      const errors = await errorsOf(variationSchema, { color: "Red", size: "M", sku, extraPrice: 0 });
      expect(errors.sku).toBe(MESSAGES.skuFormat);
    },
  );

  it("requires every variation field", async () => {
    const errors = await errorsOf(variationSchema, { color: "", size: " ", sku: "", extraPrice: null });
    expect(errors).toMatchObject({
      color: "Color is required",
      size: "Size is required",
      sku: "SKU code is required",
      extraPrice: "Extra price is required",
    });
  });

  it("rejects a negative extra price", async () => {
    const errors = await errorsOf(variationSchema, { color: "Red", size: "M", sku: "SKU-RED-1001", extraPrice: -1 });
    expect(errors.extraPrice).toBe("Extra price cannot be negative");
  });
});

describe("duplicate SKU detection", () => {
  it("returns the indexes of repeated SKUs (case-insensitive, trimmed)", () => {
    expect(findDuplicateSkuIndexes([{ sku: "SKU-RED-1001" }, { sku: "SKU-BLU-1001" }, { sku: " sku-red-1001 " }, { sku: "SKU-RED-1001" }])).toEqual([2, 3]);
  });

  it("ignores empty SKUs and missing entries", () => {
    expect(findDuplicateSkuIndexes([{ sku: "" }, { sku: "" }, undefined, { sku: null }])).toEqual([]);
  });

  it("attaches the duplicate error to the offending row's sku path", async () => {
    const errors = await errorsOf(pricingSchema, {
      ...validPricing,
      variations: [
        { color: "Red", size: "M", sku: "SKU-RED-1001", extraPrice: 0 },
        { color: "Red", size: "L", sku: "SKU-RED-1001", extraPrice: 5 },
      ],
    });
    expect(errors["variations[1].sku"]).toBe(MESSAGES.skuDuplicate);
    expect(errors["variations[0].sku"]).toBeUndefined();
  });

  it("accepts unique SKUs", async () => {
    const errors = await errorsOf(pricingSchema, {
      ...validPricing,
      variations: [
        { color: "Red", size: "M", sku: "SKU-RED-1001", extraPrice: 0 },
        { color: "Blue", size: "M", sku: "SKU-BLU-1001", extraPrice: 0 },
      ],
    });
    expect(errors).toEqual({});
  });
});

describe("price, stock and discount bounds", () => {
  it.each([
    [0, MESSAGES.pricePositive.replace("Price", "Base price")],
    [-5, "Base price must be greater than 0"],
    [null, "Base price is required"],
    ["", "Base price is required"],
  ])("rejects price %s", async (price, message) => {
    const errors = await errorsOf(pricingSchema, { ...validPricing, price });
    expect(errors.price).toBe(message);
  });

  it("accepts a price just above zero", async () => {
    expect(await errorsOf(pricingSchema, { ...validPricing, price: 0.01 })).toEqual({});
  });

  it("requires stock to be a non-negative integer", async () => {
    expect((await errorsOf(pricingSchema, { ...validPricing, stock: -1 })).stock).toBe(MESSAGES.stockMin);
    expect((await errorsOf(pricingSchema, { ...validPricing, stock: 1.5 })).stock).toBe(MESSAGES.stockInteger);
    expect((await errorsOf(pricingSchema, { ...validPricing, stock: 0 })).stock).toBeUndefined();
  });

  it("treats the discount as optional but bounded to 0..99", async () => {
    expect((await errorsOf(pricingSchema, { ...validPricing, discountPercentage: null })).discountPercentage).toBeUndefined();
    expect((await errorsOf(pricingSchema, { ...validPricing, discountPercentage: 0 })).discountPercentage).toBeUndefined();
    expect((await errorsOf(pricingSchema, { ...validPricing, discountPercentage: 99 })).discountPercentage).toBeUndefined();
    expect((await errorsOf(pricingSchema, { ...validPricing, discountPercentage: 100 })).discountPercentage).toBe(MESSAGES.discountRange);
    expect((await errorsOf(pricingSchema, { ...validPricing, discountPercentage: -1 })).discountPercentage).toBe(MESSAGES.discountRange);
  });

  it("treats non-numeric input (NaN) as a missing value", async () => {
    expect((await errorsOf(pricingSchema, { ...validPricing, price: "abc" })).price).toBe("Base price is required");
    expect((await errorsOf(pricingSchema, { ...validPricing, price: Number.NaN })).price).toBe("Base price is required");
  });
});

describe("fragile handling (conditional validation)", () => {
  it("does not require disclaimer or notes when the item is not fragile", async () => {
    expect(await errorsOf(shippingSchema, validShipping)).toEqual({});
  });

  it("requires the disclaimer and notes when fragile is checked", async () => {
    const errors = await errorsOf(shippingSchema, { ...validShipping, fragile: true });
    expect(errors.hazardousDisclaimer).toBe(MESSAGES.hazardousRequired);
    expect(errors.shippingNotes).toBe(MESSAGES.notesRequired);
  });

  it("enforces a 10 character minimum on notes for fragile items", async () => {
    const errors = await errorsOf(shippingSchema, {
      ...validShipping,
      fragile: true,
      hazardousDisclaimer: true,
      shippingNotes: "too short",
    });
    expect(errors).toEqual({ shippingNotes: MESSAGES.notesMin });
  });

  it("passes when all fragile requirements are met", async () => {
    const errors = await errorsOf(shippingSchema, {
      ...validShipping,
      fragile: true,
      hazardousDisclaimer: true,
      shippingNotes: "Keep upright at all times",
    });
    expect(errors).toEqual({});
  });

  it("requires positive weight and dimensions", async () => {
    const errors = await errorsOf(shippingSchema, { ...validShipping, weight: 0, dimensions: { width: null, height: -1, depth: 2 } });
    expect(errors).toMatchObject({
      weight: "Weight must be greater than 0",
      "dimensions.width": "Width is required",
      "dimensions.height": "Height must be greater than 0",
    });
  });
});

describe("basic info", () => {
  it("validates title length, brand, category and description", async () => {
    const errors = await errorsOf(basicInfoSchema, { title: "ab", brand: "", category: "", description: "short" });
    expect(errors).toEqual({
      title: "Title must be at least 3 characters",
      brand: "Brand is required",
      category: "Please select a category",
      description: "Description must be at least 20 characters",
    });
    const tooLong = await errorsOf(basicInfoSchema, { ...validBasic, title: "x".repeat(101) });
    expect(tooLong.title).toBe("Title must be at most 100 characters");
  });
});

describe("productWizardSchema (composed)", () => {
  it("validates a complete product", async () => {
    const value = await productWizardSchema.validate({ ...validBasic, ...validPricing, ...validShipping });
    expect(value.title).toBe("Wireless Headphones");
  });

  it("collects errors across all steps", async () => {
    const errors = await errorsOf(productWizardSchema, { ...validBasic, title: "", ...validPricing, price: 0, ...validShipping, weight: null });
    expect(Object.keys(errors).sort()).toEqual(["price", "title", "weight"]);
  });
});
