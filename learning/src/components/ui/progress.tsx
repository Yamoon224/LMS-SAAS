import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  label: string;
  className?: string;
}

/** Barre de progression accessible (role=progressbar). */
export function Progress({ value, label, className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-ink/10", className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-slow" style={{ width: `${clamped}%` }} />
    </div>
  );
}
