import type { Metadata } from "next";
import { WizardLoader } from "@/features/wizard/components/WizardLoader";

export const metadata: Metadata = {
  title: "New product",
  description: "Onboard a new product in four steps.",
};

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New product</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your progress is saved automatically. You can leave and resume at any time.
        </p>
      </div>
      <WizardLoader />
    </div>
  );
}
