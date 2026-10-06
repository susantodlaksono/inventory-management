import { describe, expect, it } from "vitest";
import { toCreateProductPayload } from "../toPayload";

const values = {
  title: "  Lamp  ",
  brand: " Acme ",
  category: "home-decoration",
  description: " A lamp that lights up the whole room. ",
  price: 30,
  stock: 4,
  discountPercentage: null,
  variations: [{ color: " Red ", size: "M", sku: "SKU-RED-1001", extraPrice: 2 }],
  weight: 1.5,
  dimensions: { width: 10, height: 20, depth: 10 },
  fragile: false,
  hazardousDisclaimer: true,
  shippingNotes: "ignored when not fragile",
};

describe("toCreateProductPayload", () => {
  it("trims strings, defaults discount and drops fragile-only fields", () => {
    expect(toCreateProductPayload(values)).toEqual({
      title: "Lamp",
      brand: "Acme",
      category: "home-decoration",
      description: "A lamp that lights up the whole room.",
      price: 30,
      stock: 4,
      discountPercentage: 0,
      variations: [{ color: "Red", size: "M", sku: "SKU-RED-1001", extraPrice: 2 }],
      weight: 1.5,
      dimensions: { width: 10, height: 20, depth: 10 },
      shipping: { fragile: false, hazardousDisclaimerAccepted: false, notes: "" },
    });
  });

  it("keeps shipping details for fragile items", () => {
    const payload = toCreateProductPayload({ ...values, fragile: true, shippingNotes: " Handle with care " });
    expect(payload.shipping).toEqual({ fragile: true, hazardousDisclaimerAccepted: true, notes: "Handle with care" });
  });
});
