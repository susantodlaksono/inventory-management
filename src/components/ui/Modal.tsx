"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "@/hooks/useOverlay";
import { cn } from "@/lib/utils/format";
import { CloseIcon } from "./Icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
  dismissible?: boolean;
}

export function Modal({ open, onClose, title, description, children, footer, size = "md", dismissible = true }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useOverlay(open, dismissible ? onClose : () => undefined);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full animate-pop-in rounded-t-2xl bg-white shadow-xl ring-1 ring-slate-900/5 outline-none sm:rounded-2xl",
          size === "sm" ? "sm:max-w-md" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close dialog"
            >
              <CloseIcon className="size-5" />
            </button>
          ) : null}
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
