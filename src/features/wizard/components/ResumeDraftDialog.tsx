"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { PersistedDraft } from "@/features/wizard/draftStorage";
import { WIZARD_STEPS } from "@/features/wizard/schemas/formTypes";

export interface ResumeDraftDialogProps {
  draft: PersistedDraft | null;
  onResume: (draft: PersistedDraft) => void;
  onDiscard: () => void;
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "recently"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ResumeDraftDialog({ draft, onResume, onDiscard }: ResumeDraftDialogProps) {
  const stepTitle = draft ? WIZARD_STEPS.find((step) => step.id === draft.step)?.title : undefined;
  return (
    <Modal
      open={draft !== null}
      onClose={onDiscard}
      dismissible={false}
      size="sm"
      title="Resume saved product draft?"
      footer={
        <>
          <Button variant="secondary" onClick={onDiscard}>
            Start over
          </Button>
          <Button data-autofocus onClick={() => draft && onResume(draft)}>
            Resume draft
          </Button>
        </>
      }
    >
      {draft ? (
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            You have an unfinished product
            {draft.values.title ? (
              <>
                {" "}
                <span className="font-medium text-slate-900">“{draft.values.title}”</span>
              </>
            ) : null}{" "}
            saved on {formatSavedAt(draft.savedAt)}.
          </p>
          {stepTitle ? <p>You were on step {draft.step}: {stepTitle}.</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}
