import { describe, expect, it } from "vitest";
import { cn, formatCurrency, formatPercent, getDiscountedPrice, getStockLevel, humanizeSlug } from "../format";

describe("format utils", () => {
  it("formats currency and percentages", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
    expect(formatPercent(10)).toBe("10%");
    expect(formatPercent(12.48)).toBe("12.5%");
  });

  it("computes discounted prices rounded to cents", () => {
    expect(getDiscountedPrice(100, 15)).toBe(85);
    expect(getDiscountedPrice(9.99, 10.48)).toBe(8.94);
    expect(getDiscountedPrice(50, null)).toBe(50);
    expect(getDiscountedPrice(50, undefined)).toBe(50);
  });

  it("classifies stock levels", () => {
    expect(getStockLevel(0)).toBe("out");
    expect(getStockLevel(-2)).toBe("out");
    expect(getStockLevel(9)).toBe("low");
    expect(getStockLevel(10)).toBe("in");
    expect(getStockLevel(4, 5)).toBe("low");
  });

  it("humanizes slugs", () => {
    expect(humanizeSlug("mens-shirts")).toBe("Mens Shirts");
    expect(humanizeSlug("laptops")).toBe("Laptops");
    expect(humanizeSlug("--a--b")).toBe("A B");
  });

  it("joins class names", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
