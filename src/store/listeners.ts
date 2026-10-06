import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/lib/api/errors";
import { productsApi } from "@/lib/api/productsApi";
import { toastShown } from "@/features/ui/toastSlice";
import { viewModeChanged } from "@/features/ui/uiSlice";
import { clearDraftFromStorage, saveDraftToStorage } from "@/features/wizard/draftStorage";
import { draftDiscarded, draftRestored, draftSaved, stepChanged, submitProduct } from "@/features/wizard/draftSlice";
import type { AppDispatch } from "./store";
import type { RootState } from "./rootReducer";

export const VIEW_MODE_STORAGE_KEY = "inventory:view-mode";

export const listenerMiddleware = createListenerMiddleware();
const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>();

/* --------------------- Optimistic write feedback (toasts) ------------------- */

startAppListening({
  matcher: productsApi.endpoints.deleteProduct.matchRejected,
  effect: (action, { dispatch }) => {
    if (action.meta.condition) return;
    dispatch(
      toastShown({
        variant: "error",
        title: "Delete failed — product restored",
        message: getErrorMessage(action.payload ?? action.error),
        retry: { endpoint: "deleteProduct", arg: action.meta.arg.originalArgs },
      }),
    );
  },
});

startAppListening({
  matcher: productsApi.endpoints.updateProduct.matchRejected,
  effect: (action, { dispatch }) => {
    if (action.meta.condition) return;
    dispatch(
      toastShown({
        variant: "error",
        title: "Update failed — changes rolled back",
        message: getErrorMessage(action.payload ?? action.error),
        retry: { endpoint: "updateProduct", arg: action.meta.arg.originalArgs },
      }),
    );
  },
});

startAppListening({
  matcher: productsApi.endpoints.deleteProduct.matchFulfilled,
  effect: (action, { dispatch }) => {
    dispatch(toastShown({ variant: "success", title: `Deleted “${action.payload.title}”` }));
  },
});

startAppListening({
  matcher: productsApi.endpoints.updateProduct.matchFulfilled,
  effect: (action, { dispatch }) => {
    dispatch(toastShown({ variant: "success", title: `Saved “${action.payload.title}”` }));
  },
});

/* ---------------------------- Draft persistence ---------------------------- */

startAppListening({
  matcher: isAnyOf(draftSaved, draftRestored, stepChanged),
  effect: (_action, { getState }) => {
    const { values, step, savedAt } = getState().draft;
    if (values && savedAt) saveDraftToStorage({ values, step, savedAt });
  },
});

startAppListening({
  matcher: isAnyOf(draftDiscarded, submitProduct.fulfilled),
  effect: () => clearDraftFromStorage(),
});

startAppListening({
  actionCreator: submitProduct.fulfilled,
  effect: (action, { dispatch }) => {
    dispatch(
      toastShown({
        variant: "success",
        title: "Product created",
        message: `“${action.payload.title}” was created with ID ${action.payload.id}.`,
      }),
    );
  },
});

/* ------------------------------ Preferences -------------------------------- */

startAppListening({
  actionCreator: viewModeChanged,
  effect: (action) => {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, action.payload);
    } catch {
      // ignore storage failures
    }
  },
});
