import { describe, expect, it } from "vitest";
import { DEFAULT_WIZARD_VALUES } from "../schemas/formTypes";
import {
  DRAFT_STORAGE_KEY,
  clearDraftFromStorage,
  hasMeaningfulContent,
  loadDraft,
  parsePersistedDraft,
  sanitizeDraftValues,
  saveDraftToStorage,
} from "../draftStorage";

const draft = {
  values: { ...DEFAULT_WIZARD_VALUES, title: "Lamp", price: 20, variations: [{ color: "Red", size: "M", sku: "SKU-RED-1001", extraPrice: 0 }] },
  step: 2 as const,
  savedAt: "2026-01-01T10:00:00.000Z",
};

describe("draft storage", () => {
  it("saves, loads and clears drafts", () => {
    saveDraftToStorage(draft);
    expect(loadDraft()).toEqual(draft);
    clearDraftFromStorage();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(loadDraft()).toBeNull();
  });

  it("rejects corrupt or incomplete JSON", () => {
    expect(parsePersistedDraft(null)).toBeNull();
    expect(parsePersistedDraft("{not json")).toBeNull();
    expect(parsePersistedDraft(JSON.stringify({ values: {} }))).toBeNull();
  });

  it("defaults an invalid step to 1", () => {
    expect(parsePersistedDraft(JSON.stringify({ ...draft, step: 9 }))?.step).toBe(1);
  });

  it("sanitises untrusted values", () => {
    const sanitized = sanitizeDraftValues({
      title: 42,
      price: "12",
      weight: 3,
      fragile: "yes",
      dimensions: { width: 1, height: null },
      variations: [{ sku: "SKU-RED-1001", extraPrice: "x" }, "bad"],
    });
    expect(sanitized).toMatchObject({
      title: "",
      price: null,
      weight: 3,
      fragile: false,
      dimensions: { width: 1, height: null, depth: null },
      variations: [{ color: "", size: "", sku: "SKU-RED-1001", extraPrice: null }],
    });
    expect(sanitizeDraftValues(null)).toEqual(DEFAULT_WIZARD_VALUES);
  });

  it("detects whether a draft has user content", () => {
    expect(hasMeaningfulContent(DEFAULT_WIZARD_VALUES)).toBe(false);
    expect(hasMeaningfulContent({ ...DEFAULT_WIZARD_VALUES, brand: "x" })).toBe(true);
  });

  it("never throws when storage is unavailable", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(loadDraft(broken)).toBeNull();
    expect(() => saveDraftToStorage(draft, broken)).not.toThrow();
    expect(() => clearDraftFromStorage(broken)).not.toThrow();
    expect(loadDraft(null)).toBeNull();
  });
});
