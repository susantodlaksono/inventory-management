"use client";

import { useEffect, useRef, useState } from "react";
import { productsApi } from "@/lib/api/productsApi";
import { cn } from "@/lib/utils/format";
import { selectToasts, toastDismissed, type RetryAction, type Toast } from "@/features/ui/toastSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AppDispatch } from "@/store/store";
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from "./Icons";

function runRetry(dispatch: AppDispatch, retry: RetryAction) {
  switch (retry.endpoint) {
    case "deleteProduct":
      return dispatch(productsApi.endpoints.deleteProduct.initiate(retry.arg));
    case "updateProduct":
      return dispatch(productsApi.endpoints.updateProduct.initiate(retry.arg));
  }
}

const VARIANT_STYLES = {
  success: { icon: CheckIcon, accent: "bg-emerald-100 text-emerald-700" },
  error: { icon: AlertIcon, accent: "bg-rose-100 text-rose-700" },
  info: { icon: InfoIcon, accent: "bg-sky-100 text-sky-700" },
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.durationMs);

  useEffect(() => {
    if (paused) return undefined;
    const startedAt = Date.now();
    const timer = setTimeout(() => dispatch(toastDismissed(toast.id)), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [dispatch, paused, toast.id]);

  const { icon: Icon, accent } = VARIANT_STYLES[toast.variant];

  return (
    <li
      role={toast.variant === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto flex w-full animate-slide-in-right items-start gap-3 rounded-xl bg-white p-3.5 shadow-lg ring-1 ring-slate-900/10"
    >
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", accent)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.message ? <p className="mt-0.5 text-sm text-slate-600">{toast.message}</p> : null}
        {toast.retry ? (
          <button
            type="button"
            onClick={() => {
              if (toast.retry) runRetry(dispatch, toast.retry);
              dispatch(toastDismissed(toast.id));
            }}
            className="mt-2 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
          >
            Retry
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dispatch(toastDismissed(toast.id))}
        aria-label="Dismiss notification"
        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <CloseIcon className="size-4" />
      </button>
    </li>
  );
}

export function Toaster() {
  const toasts = useAppSelector(selectToasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 sm:justify-end">
      <ol className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ol>
    </div>
  );
}
