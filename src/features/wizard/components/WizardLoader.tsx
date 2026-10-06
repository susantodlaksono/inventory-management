"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

function WizardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading wizard">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <div className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}

/**
 * The wizard restores drafts from localStorage, which only exists in the browser.
 * Rendering it client-only avoids a hydration mismatch and keeps the form bundle
 * out of the initial server HTML.
 */
export const WizardLoader = dynamic(() => import("./ProductWizard").then((mod) => mod.ProductWizard), {
  ssr: false,
  loading: WizardSkeleton,
});
