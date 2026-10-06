import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { makeStore } from "@/store/store";
import { API } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import draftSlice, {
  draftDiscarded,
  draftRestored,
  draftSaved,
  initialDraftState,
  selectDraft,
  selectSubmission,
  stepChanged,
  submissionReset,
  submitProduct,
} from "../draftSlice";
import { DRAFT_STORAGE_KEY, loadDraft } from "../draftStorage";
import { DEFAULT_WIZARD_VALUES } from "../schemas/formTypes";
import type { ProductWizardValues } from "../schemas/productSchema";

const reducer = draftSlice.reducer;
const values = { ...DEFAULT_WIZARD_VALUES, title: "Desk lamp" };

const validValues: ProductWizardValues = {
  title: "Desk lamp",
  brand: "Acme",
  category: "home-decoration",
  description: "A warm LED desk lamp with three brightness levels.",
  price: 49.99,
  stock: 12,
  discountPercentage: 10,
  variations: [{ color: "Black", size: "S", sku: "SKU-BLK-1001", extraPrice: 0 }],
  weight: 1.1,
  dimensions: { width: 15, height: 40, depth: 15 },
  fragile: true,
  hazardousDisclaimer: true,
  shippingNotes: "Ship with the bulb removed",
};

describe("draftSlice reducers", () => {
  it("saves a draft with a timestamp", () => {
    const state = reducer(undefined, draftSaved({ values, step: 2 }));
    expect(state.values).toEqual(values);
    expect(state.step).toBe(2);
    expect(Number.isNaN(Date.parse(state.savedAt ?? ""))).toBe(false);
  });

  it("changes step, restores and discards drafts", () => {
    let state = reducer(undefined, stepChanged(3));
    expect(state.step).toBe(3);
    state = reducer(state, draftRestored({ values, step: 4, savedAt: "2026-01-01T00:00:00.000Z" }));
    expect(selectDraft({ draft: state })).toMatchObject({ values, step: 4, savedAt: "2026-01-01T00:00:00.000Z" });
    expect(reducer(state, draftDiscarded())).toEqual(initialDraftState);
  });

  it("tracks the submission lifecycle", () => {
    let state = reducer(undefined, { type: submitProduct.pending.type });
    expect(state.submission.status).toBe("submitting");
    state = reducer(state, { type: submitProduct.rejected.type, payload: "Nope", error: {} });
    expect(state.submission).toEqual({ status: "failed", error: "Nope", createdProduct: null });
    state = reducer(state, { type: submitProduct.rejected.type, error: { message: "Thrown" } });
    expect(state.submission.error).toBe("Thrown");
    expect(reducer(state, submissionReset()).submission).toEqual(initialDraftState.submission);
  });
});

describe("draft persistence (listener middleware)", () => {
  it("writes drafts and step changes to localStorage", () => {
    const store = makeStore();
    store.dispatch(draftSaved({ values, step: 1 }));
    expect(loadDraft()?.values.title).toBe("Desk lamp");
    store.dispatch(stepChanged(3));
    expect(loadDraft()?.step).toBe(3);
  });

  it("does not persist a step change when there is no draft", () => {
    const store = makeStore();
    store.dispatch(stepChanged(2));
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("clears storage when the draft is discarded", () => {
    const store = makeStore();
    store.dispatch(draftSaved({ values, step: 1 }));
    store.dispatch(draftDiscarded());
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("submitProduct thunk", () => {
  it("POSTs the mapped payload, stores the created product and clears the draft", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/products/add`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 195, ...(body as object) });
      }),
    );
    const store = makeStore();
    store.dispatch(draftSaved({ values, step: 4 }));

    const result = await store.dispatch(submitProduct(validValues));

    expect(submitProduct.fulfilled.match(result)).toBe(true);
    expect(body).toMatchObject({ title: "Desk lamp", price: 49.99, shipping: { fragile: true, notes: "Ship with the bulb removed" } });
    expect(selectSubmission(store.getState())).toEqual({
      status: "succeeded",
      error: null,
      createdProduct: { id: 195, title: "Desk lamp" },
    });
    expect(store.getState().draft.values).toBeNull();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(store.getState().toasts.items.at(-1)?.title).toBe("Product created");
  });

  it("rejects with a readable message and keeps the draft", async () => {
    server.use(http.post(`${API}/products/add`, () => HttpResponse.json({ message: "Validation failed" }, { status: 400 })));
    const store = makeStore();
    store.dispatch(draftSaved({ values, step: 4 }));

    const result = await store.dispatch(submitProduct(validValues));

    expect(submitProduct.rejected.match(result)).toBe(true);
    expect(selectSubmission(store.getState())).toMatchObject({ status: "failed", error: "Validation failed" });
    expect(loadDraft()?.values.title).toBe("Desk lamp");
  });
});
