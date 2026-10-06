import { combineSlices } from "@reduxjs/toolkit";
import filtersSlice from "@/features/products/filtersSlice";
import optimisticSlice from "@/features/products/optimisticSlice";
import toastSlice from "@/features/ui/toastSlice";
import uiSlice from "@/features/ui/uiSlice";
import draftSlice from "@/features/wizard/draftSlice";
import { productsApi } from "@/lib/api/productsApi";

/**
 * Client UI state (filters, view mode, toasts, wizard draft) lives in slices.
 * Server data lives exclusively in the RTK Query cache (`productsApi`).
 */
export const rootReducer = combineSlices(filtersSlice, uiSlice, toastSlice, optimisticSlice, draftSlice, productsApi);

export type RootState = ReturnType<typeof rootReducer>;
