import { useMemo, useSyncExternalStore } from "react";

/**
 * Minimal stand-in for `next/navigation` that mirrors how the App Router reacts to the
 * native History API: `useSearchParams` re-renders after pushState/replaceState/popstate.
 */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

let patched = false;
function patchHistory() {
  if (patched) return;
  patched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      notify();
    };
  }
  window.addEventListener("popstate", notify);
}

function subscribe(listener: () => void) {
  patchHistory();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname, () => "/");
}

export function useRouter() {
  return { push: () => undefined, replace: () => undefined, back: () => window.history.back(), prefetch: () => undefined };
}
