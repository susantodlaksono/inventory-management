import { CheckIcon } from "@/components/ui/Icons";
import { WIZARD_STEPS, type WizardStep } from "@/features/wizard/schemas/formTypes";
import { cn } from "@/lib/utils/format";

export interface StepperProps {
  current: WizardStep;
  onStepClick: (step: WizardStep) => void;
}

export function Stepper({ current, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol className="grid grid-cols-4 gap-2">
        {WIZARD_STEPS.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!done}
                onClick={() => onStepClick(step.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex w-full flex-col border-t-4 pt-3 text-left transition-colors disabled:cursor-default",
                  done && "border-brand-600 hover:border-brand-700",
                  active && "border-brand-600",
                  !done && !active && "border-slate-200",
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase",
                    done || active ? "text-brand-700" : "text-slate-400",
                  )}
                >
                  {done ? <CheckIcon className="size-3.5" /> : null}
                  Step {step.id}
                </span>
                <span className={cn("mt-0.5 hidden text-sm font-medium sm:block", active ? "text-slate-900" : "text-slate-600")}>
                  {step.title}
                </span>
                <span className="hidden text-xs text-slate-500 lg:block">{step.description}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
