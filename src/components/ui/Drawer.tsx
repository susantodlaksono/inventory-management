"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "@/hooks/useOverlay";
import { CloseIcon } from "./Icons";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Slide-out panel from the left edge, built with plain Tailwind utilities. */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const titleId = useId();
  const panelRef = useOverlay(open, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="absolute inset-0 animate-fade-in bg-slate-900/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[85vw] max-w-sm animate-slide-in-left flex-col bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-4 py-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
