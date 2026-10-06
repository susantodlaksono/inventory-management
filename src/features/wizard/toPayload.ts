import type { CreateProductPayload } from "@/lib/api/types";
import type { ProductWizardValues } from "./schemas/productSchema";

/** Maps validated wizard output to the DummyJSON create-product request body. */
export function toCreateProductPayload(values: ProductWizardValues): CreateProductPayload {
  return {
    title: values.title.trim(),
    brand: values.brand.trim(),
    category: values.category,
    description: values.description.trim(),
    price: values.price,
    stock: values.stock,
    discountPercentage: values.discountPercentage ?? 0,
    variations: values.variations.map((variation) => ({
      color: variation.color.trim(),
      size: variation.size.trim(),
      sku: variation.sku.trim(),
      extraPrice: variation.extraPrice,
    })),
    weight: values.weight,
    dimensions: { ...values.dimensions },
    shipping: {
      fragile: values.fragile,
      hazardousDisclaimerAccepted: values.fragile ? values.hazardousDisclaimer : false,
      notes: values.fragile ? values.shippingNotes.trim() : "",
    },
  };
}
