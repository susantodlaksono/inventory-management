import { describe, expect, it } from "vitest";
import { getErrorMessage, isFetchBaseQueryError, isSerializedError } from "../errors";
import { isCategory, isProduct, isProductsResponse } from "../guards";

describe("getErrorMessage", () => {
  it("reads fetch errors", () => {
    expect(getErrorMessage({ status: "FETCH_ERROR", error: "Network down" })).toBe("Network down");
  });

  it("reads the API message from the response body", () => {
    expect(getErrorMessage({ status: 404, data: { message: "Product with id '999' not found" } })).toBe(
      "Product with id '999' not found",
    );
    expect(getErrorMessage({ status: 500, data: "Server exploded" })).toBe("Server exploded");
  });

  it("falls back to the status code", () => {
    expect(getErrorMessage({ status: 503, data: null })).toBe("Request failed with status 503.");
  });

  it("handles serialized and native errors", () => {
    expect(getErrorMessage({ message: "Rejected" })).toBe("Rejected");
    expect(getErrorMessage(new Error("Boom"))).toBe("Boom");
  });

  it("uses the fallback for unknown values", () => {
    expect(getErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage({ status: "CUSTOM_ERROR" }, "Custom fallback")).toBe("Custom fallback");
    expect(getErrorMessage(42, "nope")).toBe("nope");
  });

  it("exposes type guards", () => {
    expect(isFetchBaseQueryError({ status: 400 })).toBe(true);
    expect(isFetchBaseQueryError("x")).toBe(false);
    expect(isSerializedError({ message: 1 })).toBe(false);
  });
});

describe("response guards", () => {
  it("recognises products and list responses", () => {
    const product = { id: 1, title: "x", price: 1 };
    expect(isProduct(product)).toBe(true);
    expect(isProduct({ id: "1", title: "x", price: 1 })).toBe(false);
    expect(isProductsResponse({ products: [product], total: 1 })).toBe(true);
    expect(isProductsResponse({ products: [{}], total: 1 })).toBe(false);
    expect(isProductsResponse([])).toBe(false);
  });

  it("recognises categories", () => {
    expect(isCategory({ slug: "a", name: "A" })).toBe(true);
    expect(isCategory("a")).toBe(false);
  });
});
