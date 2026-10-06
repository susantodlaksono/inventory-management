"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { Field, TextInput, describedBy, toNullableNumber } from "@/components/form/fields";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { diffProductChanges, editProductSchema, type EditProductValues } from "@/features/products/schemas/editProductSchema";
import { useUpdateProductMutation } from "@/lib/api/productsApi";
import type { Product } from "@/lib/api/types";

export interface EditProductDialogProps {
  product: Product;
  onClose: () => void;
}

export default function EditProductDialog({ product, onClose }: EditProductDialogProps) {
  const [updateProduct] = useUpdateProductMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditProductValues>({
    resolver: yupResolver(editProductSchema),
    mode: "onTouched",
    defaultValues: {
      title: product.title,
      price: product.price,
      stock: product.stock,
      discountPercentage: product.discountPercentage,
    },
  });

  const onSubmit = handleSubmit((values) => {
    const changes = diffProductChanges(product, values);
    if (Object.keys(changes).length > 0) {
      // Fire-and-forget: the cache is patched optimistically and rolled back on failure;
      // failures surface as a toast with a Retry action.
      void updateProduct({ id: product.id, changes });
    }
    onClose();
  });

  const numberOptions = { setValueAs: toNullableNumber };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit product"
      description="Changes appear instantly and are rolled back if the server rejects them."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-product-form" disabled={!isDirty}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-product-form" noValidate onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
        <Field id="edit-title" label="Title" required error={errors.title?.message} className="col-span-2">
          <TextInput
            id="edit-title"
            data-autofocus
            invalid={Boolean(errors.title)}
            aria-describedby={describedBy("edit-title", errors.title?.message)}
            {...register("title")}
          />
        </Field>
        <Field id="edit-price" label="Price (USD)" required error={errors.price?.message}>
          <TextInput
            id="edit-price"
            type="number"
            step="0.01"
            inputMode="decimal"
            invalid={Boolean(errors.price)}
            aria-describedby={describedBy("edit-price", errors.price?.message)}
            {...register("price", numberOptions)}
          />
        </Field>
        <Field id="edit-stock" label="Stock" required error={errors.stock?.message}>
          <TextInput
            id="edit-stock"
            type="number"
            step="1"
            inputMode="numeric"
            invalid={Boolean(errors.stock)}
            aria-describedby={describedBy("edit-stock", errors.stock?.message)}
            {...register("stock", numberOptions)}
          />
        </Field>
        <Field id="edit-discount" label="Discount (%)" required error={errors.discountPercentage?.message} className="col-span-2">
          <TextInput
            id="edit-discount"
            type="number"
            step="0.01"
            invalid={Boolean(errors.discountPercentage)}
            aria-describedby={describedBy("edit-discount", errors.discountPercentage?.message)}
            {...register("discountPercentage", numberOptions)}
          />
        </Field>
      </form>
    </Modal>
  );
}
