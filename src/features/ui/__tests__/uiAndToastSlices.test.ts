import { describe, expect, it } from "vitest";
import toastSlice, { MAX_TOASTS, selectToasts, toastDismissed, toastShown, toastsCleared } from "../toastSlice";
import uiSlice, { filterDrawerClosed, filterDrawerOpened, selectIsFilterDrawerOpen, selectViewMode, viewModeChanged } from "../uiSlice";

describe("uiSlice", () => {
  const reducer = uiSlice.reducer;

  it("toggles the view mode", () => {
    const state = reducer(undefined, viewModeChanged("grid"));
    expect(selectViewMode({ ui: state })).toBe("grid");
  });

  it("opens and closes the filter drawer", () => {
    const open = reducer(undefined, filterDrawerOpened());
    expect(selectIsFilterDrawerOpen({ ui: open })).toBe(true);
    expect(reducer(open, filterDrawerClosed()).isFilterDrawerOpen).toBe(false);
  });
});

describe("toastSlice", () => {
  const reducer = toastSlice.reducer;

  it("adds toasts with ids and default durations per variant", () => {
    let state = reducer(undefined, toastShown({ variant: "success", title: "Saved" }));
    state = reducer(state, toastShown({ variant: "error", title: "Failed", retry: { endpoint: "deleteProduct", arg: 3 } }));
    const [success, error] = selectToasts({ toasts: state });
    expect(success).toMatchObject({ title: "Saved", durationMs: 3500 });
    expect(error).toMatchObject({ durationMs: 8000, retry: { endpoint: "deleteProduct", arg: 3 } });
    expect(success.id).not.toBe(error.id);
  });

  it("respects a custom duration", () => {
    const state = reducer(undefined, toastShown({ variant: "info", title: "x", durationMs: 100 }));
    expect(state.items[0].durationMs).toBe(100);
  });

  it(`keeps at most ${MAX_TOASTS} toasts, dropping the oldest`, () => {
    let state = reducer(undefined, { type: "@@init" });
    for (let i = 0; i < MAX_TOASTS + 2; i += 1) state = reducer(state, toastShown({ variant: "info", title: `#${i}` }));
    expect(state.items).toHaveLength(MAX_TOASTS);
    expect(state.items[0].title).toBe("#2");
  });

  it("dismisses and clears toasts", () => {
    let state = reducer(undefined, toastShown({ variant: "info", title: "a" }));
    state = reducer(state, toastShown({ variant: "info", title: "b" }));
    state = reducer(state, toastDismissed(state.items[0].id));
    expect(state.items.map((t) => t.title)).toEqual(["b"]);
    expect(reducer(state, toastsCleared()).items).toEqual([]);
  });
});
