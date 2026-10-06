"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Product } from "@/lib/api/types";

export interface DeleteProductDialogProps {
  product: Product | null;
  onCancel: () => void;
  onConfirm: (product: Product) => void;
}

export function DeleteProductDialog({ product, onCancel, onConfirm }: DeleteProductDialogProps) {
  return (
    <Modal
      open={product !== null}
      onClose={onCancel}
      size="sm"
      title="Delete product?"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => product && onConfirm(product)}>
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{product?.title}</span> will be removed from the inventory. If the
        request fails, it will be restored automatically.
      </p>
    </Modal>
  );
}
