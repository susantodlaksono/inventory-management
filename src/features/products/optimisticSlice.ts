import { createSlice } from "@reduxjs/toolkit";
import { productsApi } from "@/lib/api/productsApi";
import { getErrorMessage } from "@/lib/api/errors";

export type OptimisticKind = "update" | "delete";
export type OptimisticStatus = "pending" | "rolledBack";

export interface OptimisticEntry {
  productId: number;
  kind: OptimisticKind;
  status: OptimisticStatus;
  requestId: string;
  error?: string;
}

export interface OptimisticState {
  entries: Record<number, OptimisticEntry>;
}

const initialState: OptimisticState = { entries: {} };

/**
 * Tracks the lifecycle of optimistic writes so the UI can show "saving" affordances
 * and so rollbacks are observable (and testable) in Redux state. The cache patch/undo
 * itself lives in the RTK Query endpoint's onQueryStarted.
 */
const optimisticSlice = createSlice({
  name: "optimistic",
  initialState,
  reducers: {
    rollbackAcknowledged(state, action: { payload: number }) {
      delete state.entries[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(productsApi.endpoints.updateProduct.matchPending, (state, action) => {
        const productId = action.meta.arg.originalArgs.id;
        state.entries[productId] = { productId, kind: "update", status: "pending", requestId: action.meta.requestId };
      })
      .addMatcher(productsApi.endpoints.deleteProduct.matchPending, (state, action) => {
        const productId = action.meta.arg.originalArgs;
        state.entries[productId] = { productId, kind: "delete", status: "pending", requestId: action.meta.requestId };
      })
      .addMatcher(
        (action) =>
          productsApi.endpoints.updateProduct.matchFulfilled(action) ||
          productsApi.endpoints.deleteProduct.matchFulfilled(action),
        (state, action) => {
          const arg = action.meta.arg.originalArgs;
          const productId = typeof arg === "number" ? arg : arg.id;
          // Ignore stale completions from an older request for the same product.
          if (state.entries[productId]?.requestId === action.meta.requestId) delete state.entries[productId];
        },
      )
      .addMatcher(
        (action) =>
          productsApi.endpoints.updateProduct.matchRejected(action) ||
          productsApi.endpoints.deleteProduct.matchRejected(action),
        (state, action) => {
          const arg = action.meta.arg.originalArgs;
          const productId = typeof arg === "number" ? arg : arg.id;
          const entry = state.entries[productId];
          if (entry?.requestId !== action.meta.requestId) return;
          entry.status = "rolledBack";
          entry.error = getErrorMessage(action.payload ?? action.error);
        },
      );
  },
  selectors: {
    selectOptimisticEntries: (state) => state.entries,
    selectOptimisticEntry: (state, productId: number): OptimisticEntry | undefined => state.entries[productId],
    selectPendingCount: (state) => Object.values(state.entries).filter((entry) => entry.status === "pending").length,
  },
});

export const { rollbackAcknowledged } = optimisticSlice.actions;
export const { selectOptimisticEntries, selectOptimisticEntry, selectPendingCount } = optimisticSlice.selectors;
export default optimisticSlice;
