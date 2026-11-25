"use client";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuotaUsage } from "@/features/subscription/hooks/useSubscription";
import { QUOTA_LABELS } from "@/features/subscription/schemas/subscription.schema";
import type { QuotaUsage } from "@/features/subscription/schemas/subscription.schema";

function gaugeTone(ratio: number): string {
  if (ratio >= 1) return "bg-danger";
  if (ratio >= 0.8) return "bg-warning";
  return "bg-brand";
}

function Gauge({ usage }: { usage: QuotaUsage }) {
  const label = QUOTA_LABELS[usage.name];
  const ratio = usage.limit === null || usage.limit === 0 ? 0 : Math.min(usage.current / usage.limit, 1);
  const caption = usage.limit === null ? `${usage.current} · illimité` : `${usage.current} / ${usage.limit}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{caption}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={usage.limit ?? undefined}
        aria-valuenow={usage.current}
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div className={`h-full rounded-full ${gaugeTone(ratio)}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

/** ENT-07 : jauges d'usage des quotas du plan courant. */
export function UsageGauges() {
  const { data, isLoading, isError, error } = useQuotaUsage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage du plan</CardTitle>
        <CardDescription>Consommation actuelle par rapport aux limites de votre plan.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && <Skeleton className="h-32" />}
        {isError && <ErrorBanner title="Impossible de charger l'usage." error={error} />}
        {data?.map((usage) => <Gauge key={usage.name} usage={usage} />)}
      </CardContent>
    </Card>
  );
}
