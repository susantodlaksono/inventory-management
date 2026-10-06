import { describe, expect, it } from "vitest";
import { makeProduct } from "@/test/fixtures";
import { diffProductChanges, editProductSchema } from "../editProductSchema";

describe("editProductSchema", () => {
  it("accepts valid values", async () => {
    await expect(editProductSchema.validate({ title: "New title", price: 10, stock: 0, discountPercentage: 5 })).resolves.toBeTruthy();
  });

  it.each([
    [{ title: "ab" }, "Title must be at least 3 characters"],
    [{ title: "x".repeat(101) }, "Title must be at most 100 characters"],
    [{ price: 0 }, "Price must be greater than 0"],
    [{ price: "" }, "Price is required"],
    [{ stock: 2.5 }, "Stock must be a whole number"],
    [{ stock: -1 }, "Stock cannot be negative"],
    [{ discountPercentage: 100 }, "Discount must be between 0 and 99"],
    [{ discountPercentage: null }, "Discount is required (use 0 for none)"],
  ])("rejects %o", async (override, message) => {
    await expect(
      editProductSchema.validate({ title: "Valid title", price: 10, stock: 1, discountPercentage: 0, ...override }),
    ).rejects.toThrow(message);
  });
});

describe("diffProductChanges", () => {
  const product = makeProduct({ id: 1, title: "Phone", price: 100, stock: 5, discountPercentage: 0 });

  it("returns only the fields that changed", () => {
    expect(diffProductChanges(product, { title: "Phone", price: 120, stock: 5, discountPercentage: 0 })).toEqual({ price: 120 });
  });

  it("trims titles and detects every field", () => {
    expect(diffProductChanges(product, { title: " Phone Pro ", price: 1, stock: 2, discountPercentage: 3 })).toEqual({
      title: "Phone Pro",
      price: 1,
      stock: 2,
      discountPercentage: 3,
    });
  });

  it("returns an empty object when nothing changed", () => {
    expect(diffProductChanges(product, { title: "Phone", price: 100, stock: 5, discountPercentage: 0 })).toEqual({});
  });
});
