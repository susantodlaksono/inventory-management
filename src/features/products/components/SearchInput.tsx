"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchChanged, selectSearch } from "@/features/products/filtersSlice";
import { normalizeSearch } from "@/lib/filters/urlState";
import { MAX_SEARCH_LENGTH } from "@/lib/filters/types";
import { debounce } from "@/lib/utils/debounce";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";
import { controlClass } from "@/components/form/fields";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchInput({ isSearching = false }: { isSearching?: boolean }) {
  const dispatch = useAppDispatch();
  const committed = useAppSelector(selectSearch);
  const [value, setValue] = useState(committed);
  const valueRef = useRef(value);

  // Local input state updates instantly; Redux (and therefore URL + API) only after 300ms idle.
  const commit = useMemo(
    () => debounce((next: string) => dispatch(searchChanged(next)), SEARCH_DEBOUNCE_MS),
    [dispatch],
  );
  useEffect(() => () => commit.cancel(), [commit]);

  // Reflect external changes (back/forward navigation, "clear filters") in the input,
  // unless the user is mid-typing with a commit still pending.
  useEffect(() => {
    if (!commit.pending() && normalizeSearch(valueRef.current) !== committed) {
      valueRef.current = committed;
      setValue(committed);
    }
  }, [commit, committed]);

  const update = (next: string) => {
    valueRef.current = next;
    setValue(next);
  };

  return (
    <div className="relative w-full">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        role="searchbox"
        aria-label="Search products"
        placeholder="Search…"
        maxLength={MAX_SEARCH_LENGTH}
        value={value}
        onChange={(event) => {
          update(event.target.value);
          commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit.flush();
          if (event.key === "Escape" && value) {
            commit.cancel();
            update("");
            dispatch(searchChanged(""));
          }
        }}
        className={controlClass(false, "h-10 pr-16 pl-9 [&::-webkit-search-cancel-button]:appearance-none")}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {isSearching ? <Spinner className="size-3.5 text-slate-400" /> : null}
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              commit.cancel();
              update("");
              dispatch(searchChanged(""));
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <CloseIcon className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
