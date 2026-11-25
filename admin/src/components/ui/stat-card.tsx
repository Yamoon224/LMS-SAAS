import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value?: string;
  hint?: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

/** Tuile KPI : libellé, valeur en grand, aide contextuelle. */
export function StatCard({ label, value, hint, icon: Icon, isLoading }: StatCardProps) {
  return (
    <Card className="border-b-4 border-b-brand p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 truncate font-display text-2xl font-semibold tracking-tight tabular-nums">{value ?? "—"}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
