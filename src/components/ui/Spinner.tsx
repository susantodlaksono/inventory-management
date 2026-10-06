import { cn } from "@/lib/utils/format";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
