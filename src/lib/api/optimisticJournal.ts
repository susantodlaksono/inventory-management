import type { UpdateProductArg } from "./types";

export type ProductChange =
  | { kind: "update"; id: number; changes: UpdateProductArg["changes"] }
  | { kind: "delete"; id: number };

interface Operation {
  change: ProductChange;
  settled: boolean;
}

interface Journal {
  operations: Operation[];
  render: (changes: readonly ProductChange[]) => void;
}

// getState identifies the store, so independent stores never share rollback state.
const journalsByStore = new WeakMap<object, Map<string, Journal>>();

/**
 * Keep a cache entry's original snapshot until all overlapping writes settle.
 * On failure, replay surviving writes in dispatch order instead of applying
 * index-based inverse patches that can overwrite later successful mutations.
 */
export function beginOptimisticChange(
  owner: object,
  cacheKey: string,
  change: ProductChange,
  render: Journal["render"],
): (succeeded: boolean) => void {
  let journals = journalsByStore.get(owner);
  if (!journals) {
    journals = new Map();
    journalsByStore.set(owner, journals);
  }
  let journal = journals.get(cacheKey);
  if (!journal) {
    journal = { operations: [], render };
    journals.set(cacheKey, journal);
  }
  const operation: Operation = { change, settled: false };
  journal.operations.push(operation);
  journal.render(journal.operations.map((item) => item.change));

  return (succeeded) => {
    operation.settled = true;
    if (!succeeded) {
      journal.operations = journal.operations.filter((item) => item !== operation);
      journal.render(journal.operations.map((item) => item.change));
    }
    if (journal.operations.every((item) => item.settled)) journals.delete(cacheKey);
    if (journals.size === 0) journalsByStore.delete(owner);
  };
}
