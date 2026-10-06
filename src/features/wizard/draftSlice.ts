import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { productsApi } from "@/lib/api/productsApi";
import { getErrorMessage } from "@/lib/api/errors";
import type { PersistedDraft } from "./draftStorage";
import type { ProductWizardValues } from "./schemas/productSchema";
import type { ProductWizardFormValues, WizardStep } from "./schemas/formTypes";
import { toCreateProductPayload } from "./toPayload";

export type SubmissionStatus = "idle" | "submitting" | "succeeded" | "failed";

export interface DraftState {
  step: WizardStep;
  values: ProductWizardFormValues | null;
  savedAt: string | null;
  submission: {
    status: SubmissionStatus;
    error: string | null;
    createdProduct: { id: number; title: string } | null;
  };
}

export const initialDraftState: DraftState = {
  step: 1,
  values: null,
  savedAt: null,
  submission: { status: "idle", error: null, createdProduct: null },
};

export const submitProduct = createAsyncThunk<
  { id: number; title: string },
  ProductWizardValues,
  { rejectValue: string }
>("draft/submitProduct", async (values, { dispatch, rejectWithValue }) => {
  const request = dispatch(productsApi.endpoints.addProduct.initiate(toCreateProductPayload(values)));
  try {
    const created = await request.unwrap();
    return { id: created.id, title: created.title };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Could not create the product."));
  } finally {
    request.reset();
  }
});

const draftSlice = createSlice({
  name: "draft",
  initialState: initialDraftState,
  reducers: {
    draftSaved: {
      reducer(state, action: PayloadAction<{ values: ProductWizardFormValues; step: WizardStep; savedAt: string }>) {
        state.values = action.payload.values;
        state.step = action.payload.step;
        state.savedAt = action.payload.savedAt;
      },
      prepare(payload: { values: ProductWizardFormValues; step: WizardStep }) {
        return { payload: { ...payload, savedAt: new Date().toISOString() } };
      },
    },
    stepChanged(state, action: PayloadAction<WizardStep>) {
      state.step = action.payload;
    },
    draftRestored(state, action: PayloadAction<PersistedDraft>) {
      state.values = action.payload.values;
      state.step = action.payload.step;
      state.savedAt = action.payload.savedAt;
    },
    draftDiscarded() {
      return initialDraftState;
    },
    submissionReset(state) {
      state.submission = initialDraftState.submission;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitProduct.pending, (state) => {
        state.submission = { status: "submitting", error: null, createdProduct: null };
      })
      .addCase(submitProduct.fulfilled, (state, action) => {
        state.submission = { status: "succeeded", error: null, createdProduct: action.payload };
        state.values = null;
        state.savedAt = null;
        state.step = 1;
      })
      .addCase(submitProduct.rejected, (state, action) => {
        state.submission = {
          status: "failed",
          error: action.payload ?? action.error.message ?? "Could not create the product.",
          createdProduct: null,
        };
      });
  },
  selectors: {
    selectDraft: (state) => state,
    selectDraftStep: (state) => state.step,
    selectDraftSavedAt: (state) => state.savedAt,
    selectSubmission: (state) => state.submission,
  },
});

export const { draftSaved, stepChanged, draftRestored, draftDiscarded, submissionReset } = draftSlice.actions;
export const { selectDraft, selectDraftStep, selectDraftSavedAt, selectSubmission } = draftSlice.selectors;
export default draftSlice;
