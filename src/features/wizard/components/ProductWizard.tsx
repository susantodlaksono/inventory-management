"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import {
  draftDiscarded,
  draftRestored,
  draftSaved,
  selectDraftSavedAt,
  selectDraftStep,
  selectSubmission,
  stepChanged,
  submissionReset,
  submitProduct,
} from "@/features/wizard/draftSlice";
import { hasMeaningfulContent, loadDraft, type PersistedDraft } from "@/features/wizard/draftStorage";
import {
  DEFAULT_WIZARD_VALUES,
  LAST_STEP,
  STEP_FIELDS,
  WIZARD_STEPS,
  type ProductWizardFormValues,
  type WizardStep,
} from "@/features/wizard/schemas/formTypes";
import { productWizardSchema, type ProductWizardValues } from "@/features/wizard/schemas/productSchema";
import { debounce } from "@/lib/utils/debounce";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { BasicInfoStep } from "./BasicInfoStep";
import { PricingStep } from "./PricingStep";
import { ResumeDraftDialog } from "./ResumeDraftDialog";
import { ReviewStep } from "./ReviewStep";
import { ShippingStep } from "./ShippingStep";
import { Stepper } from "./Stepper";

export const AUTOSAVE_DELAY_MS = 400;

// The form holds raw input values (numbers may be null while empty); the resolver
// validates them and hands `handleSubmit` the fully-typed schema output.
const wizardResolver = yupResolver(productWizardSchema) as unknown as Resolver<
  ProductWizardFormValues,
  unknown,
  ProductWizardValues
>;

function firstStepWithError(errors: FieldErrors<ProductWizardFormValues>): WizardStep {
  const steps = [1, 2, 3] as const;
  return steps.find((step) => STEP_FIELDS[step].some((field) => field in errors)) ?? LAST_STEP;
}

function SavedIndicator() {
  const savedAt = useAppSelector(selectDraftSavedAt);
  if (!savedAt) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-slate-500" aria-live="polite">
      <CheckIcon className="size-3.5 text-emerald-600" />
      Draft saved {new Date(savedAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
    </p>
  );
}

function SuccessPanel({ title, id, onCreateAnother }: { title: string; id: number; onCreateAnother: () => void }) {
  return (
    <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Product created</h2>
      <p className="mt-1 text-sm text-slate-600">
        <span className="font-medium text-slate-900">“{title}”</span> was accepted by the API with ID{" "}
        <span className="font-mono">{id}</span>.
      </p>
      <p className="mt-1 text-xs text-slate-500">DummyJSON simulates writes, so it will not appear in the directory.</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="secondary" onClick={onCreateAnother}>
          Create another
        </Button>
        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to inventory
        </Link>
      </div>
    </div>
  );
}

export function ProductWizard() {
  const dispatch = useAppDispatch();
  const step = useAppSelector(selectDraftStep);
  const submission = useAppSelector(selectSubmission);

  // Rendered client-only (see WizardLoader), so reading localStorage here is safe.
  const [pendingDraft, setPendingDraft] = useState<PersistedDraft | null>(() => {
    const draft = loadDraft();
    return draft && hasMeaningfulContent(draft.values) ? draft : null;
  });

  const methods = useForm<ProductWizardFormValues, unknown, ProductWizardValues>({
    resolver: wizardResolver,
    defaultValues: DEFAULT_WIZARD_VALUES,
    mode: "onTouched",
    shouldUnregister: false, // keep values of unmounted steps
  });
  const { handleSubmit, trigger, reset, getValues, subscribe } = methods;

  /* ----------------------------- Draft autosave ---------------------------- */

  const store = useAppStore();
  const autosave = useMemo(
    () =>
      debounce(() => {
        // getValues() returns React Hook Form's live internal object. Redux freezes
        // everything it stores, so we must hand it a snapshot, never the original.
        const values = structuredClone(getValues());
        if (hasMeaningfulContent(values)) dispatch(draftSaved({ values, step: store.getState().draft.step }));
      }, AUTOSAVE_DELAY_MS),
    [dispatch, getValues, store],
  );

  // Autosave stays off while the "Resume draft?" prompt is open, so an empty form can
  // never overwrite the saved draft before the user decides.
  const autosaveEnabled = pendingDraft === null;
  useEffect(() => {
    if (!autosaveEnabled) return undefined;
    // `subscribe` listens to value changes outside React's render cycle: no re-renders.
    const unsubscribe = subscribe({ formState: { values: true }, callback: () => autosave() });
    return () => {
      unsubscribe();
      autosave.flush();
    };
  }, [subscribe, autosave, autosaveEnabled]);

  // Persist on tab close / refresh even if the debounce has not fired yet.
  useEffect(() => {
    const flush = () => autosave.flush();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [autosave]);

  const resumeDraft = useCallback(
    (draft: PersistedDraft) => {
      // Give the form its own mutable copy; the draft object ends up frozen in Redux.
      reset(structuredClone(draft.values));
      dispatch(draftRestored(draft));
      setPendingDraft(null);
    },
    [dispatch, reset],
  );

  const discardDraft = useCallback(() => {
    reset(DEFAULT_WIZARD_VALUES);
    dispatch(draftDiscarded());
    setPendingDraft(null);
  }, [dispatch, reset]);

  /* ------------------------------- Navigation ------------------------------ */

  const goToStep = useCallback(
    (next: WizardStep) => {
      dispatch(stepChanged(next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [dispatch],
  );

  const goNext = async () => {
    if (step === 4) return;
    const valid = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (valid) goToStep((step + 1) as WizardStep);
  };

  const goBack = () => {
    if (step > 1) goToStep((step - 1) as WizardStep);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      autosave.cancel();
      const result = await dispatch(submitProduct(values));
      if (submitProduct.fulfilled.match(result)) reset(DEFAULT_WIZARD_VALUES);
    },
    (errors) => goToStep(firstStepWithError(errors)),
  );

  const createAnother = () => {
    dispatch(submissionReset());
    reset(DEFAULT_WIZARD_VALUES);
  };

  if (submission.status === "succeeded" && submission.createdProduct) {
    return <SuccessPanel {...submission.createdProduct} onCreateAnother={createAnother} />;
  }

  const current = WIZARD_STEPS[step - 1];
  const submitting = submission.status === "submitting";

  return (
    <FormProvider {...methods}>
      <ResumeDraftDialog draft={pendingDraft} onResume={resumeDraft} onDiscard={discardDraft} />
      <div className="space-y-6">
        <Stepper current={step} onStepClick={goToStep} />
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === LAST_STEP) void onSubmit(event);
            else void goNext();
          }}
          className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
          aria-labelledby="wizard-step-title"
        >
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 id="wizard-step-title" className="text-lg font-semibold text-slate-900">
              {current.title}
            </h2>
            <p className="text-sm text-slate-500">
              Step {step} of {WIZARD_STEPS.length} · {current.description}
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6">
            {step === 1 ? <BasicInfoStep /> : null}
            {step === 2 ? <PricingStep /> : null}
            {step === 3 ? <ShippingStep /> : null}
            {step === 4 ? <ReviewStep onEdit={goToStep} /> : null}

            {submission.status === "failed" && step === LAST_STEP ? (
              <div role="alert" className="mt-5 flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
                <AlertIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  {submission.error} Your draft is still saved. Please try submitting again.
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <SavedIndicator />
            <div className="flex gap-2 sm:ml-auto">
              {step > 1 ? (
                <Button variant="secondary" onClick={goBack} leftIcon={<ChevronLeftIcon className="size-4" />}>
                  Back
                </Button>
              ) : null}
              {step < LAST_STEP ? (
                <Button type="submit" className="flex-1 sm:flex-none">
                  Next
                  <ChevronRightIcon className="size-4" />
                </Button>
              ) : (
                <Button type="submit" loading={submitting} className="flex-1 sm:flex-none">
                  {submitting ? "Creating…" : "Create product"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
