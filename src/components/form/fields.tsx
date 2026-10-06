import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/format";

const controlBase =
  "block w-full rounded-lg border-0 bg-white text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 " +
  "focus:ring-2 focus:ring-inset focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function controlClass(invalid: boolean, extra?: string): string {
  return cn(
    controlBase,
    invalid ? "ring-rose-400 focus:ring-rose-500" : "ring-slate-300 focus:ring-brand-600",
    extra,
  );
}

export interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error wrapper with accessible wiring via ids. */
export function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-rose-500">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type InputProps = ComponentProps<"input"> & { invalid?: boolean };

export function TextInput({ invalid = false, className, ...props }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={controlClass(invalid, cn("h-10 px-3", className))} {...props} />;
}

type TextareaProps = ComponentProps<"textarea"> & { invalid?: boolean };

export function TextArea({ invalid = false, className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("px-3 py-2 leading-6", className))}
      {...props}
    />
  );
}

type SelectProps = ComponentProps<"select"> & { invalid?: boolean };

export function SelectInput({ invalid = false, className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={controlClass(invalid, cn("h-10 appearance-none pr-9 pl-3", className))}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400"
        fill="currentColor"
      >
        <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
      </svg>
    </div>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode; invalid?: boolean };

export function Checkbox({ label, description, invalid = false, id, className, ...props }: CheckboxProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      <div className="flex h-6 items-center">
        <input
          id={id}
          type="checkbox"
          aria-invalid={invalid || undefined}
          className={cn(
            "size-4 rounded border-slate-300 accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
            invalid && "outline-1 outline-rose-500",
          )}
          {...props}
        />
      </div>
      <div className="text-sm leading-6">
        <label htmlFor={id} className="font-medium text-slate-800">
          {label}
        </label>
        {description ? <p className="text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

/** Converts an <input type="number"> string into `number | null` (empty → null). */
export function toNullableNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
