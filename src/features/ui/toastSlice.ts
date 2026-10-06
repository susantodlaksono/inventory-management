import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import type { UpdateProductArg } from "@/lib/api/types";

export type ToastVariant = "success" | "error" | "info";

/** Serializable description of the action a "Retry" button should re-dispatch. */
export type RetryAction =
  | { endpoint: "deleteProduct"; arg: number }
  | { endpoint: "updateProduct"; arg: UpdateProductArg };

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  retry?: RetryAction;
  durationMs: number;
}

export type ToastInput = Omit<Toast, "id" | "durationMs"> & { durationMs?: number };

export interface ToastState {
  items: Toast[];
}

export const MAX_TOASTS = 4;
const DEFAULT_DURATION: Record<ToastVariant, number> = { success: 3500, info: 3500, error: 8000 };

const initialState: ToastState = { items: [] };

const toastSlice = createSlice({
  name: "toasts",
  initialState,
  reducers: {
    toastShown: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items.push(action.payload);
        if (state.items.length > MAX_TOASTS) state.items.splice(0, state.items.length - MAX_TOASTS);
      },
      prepare(input: ToastInput) {
        return {
          payload: { ...input, id: nanoid(), durationMs: input.durationMs ?? DEFAULT_DURATION[input.variant] },
        };
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.items = state.items.filter((toast) => toast.id !== action.payload);
    },
    toastsCleared(state) {
      state.items = [];
    },
  },
  selectors: {
    selectToasts: (state) => state.items,
  },
});

export const { toastShown, toastDismissed, toastsCleared } = toastSlice.actions;
export const { selectToasts } = toastSlice.selectors;
export default toastSlice;
