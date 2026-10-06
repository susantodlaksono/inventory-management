import * as yup from "yup";
import type { EditableProductFields, Product } from "@/lib/api/types";

const toNumberOrNull = (value: unknown, original: unknown): unknown =>
  original === "" || original === null || (typeof value === "number" && Number.isNaN(value)) ? null : value;

export const editProductSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required("Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),
  price: yup
    .number()
    .transform(toNumberOrNull)
    .nullable()
    .required("Price is required")
    .moreThan(0, "Price must be greater than 0"),
  stock: yup
    .number()
    .transform(toNumberOrNull)
    .nullable()
    .required("Stock is required")
    .integer("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  discountPercentage: yup
    .number()
    .transform(toNumberOrNull)
    .nullable()
    .required("Discount is required (use 0 for none)")
    .min(0, "Discount must be between 0 and 99")
    .max(99, "Discount must be between 0 and 99"),
});

export type EditProductValues = yup.InferType<typeof editProductSchema>;

/** Only send fields that actually changed (smaller payload, smaller optimistic patch). */
export function diffProductChanges(product: Product, values: EditableProductFields): Partial<EditableProductFields> {
  const changes: Partial<EditableProductFields> = {};
  if (values.title.trim() !== product.title) changes.title = values.title.trim();
  if (values.price !== product.price) changes.price = values.price;
  if (values.stock !== product.stock) changes.stock = values.stock;
  if (values.discountPercentage !== product.discountPercentage) changes.discountPercentage = values.discountPercentage;
  return changes;
}
