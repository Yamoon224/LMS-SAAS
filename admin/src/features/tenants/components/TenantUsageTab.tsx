"use client";

import { InfoField } from "./TenantTabState";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQuotaValue, quotaTone } from "@/features/tenants/schemas/tenant-overview.schema";
import type { QuotaTone, TenantOverview } from "@/features/tenants/schemas/tenant-overview.schema";
import { formatDateTime, formatNumber } from "@/lib/format";

const BAR_CLASSES: Record<QuotaTone, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  unlimited: "bg-muted-foreground/40",
};

/** ADM-10 — Activité et usage : formations, apprenants, crédits IA, quotas du plan courant face à l'usage réel. */
export function TenantUsageTab({ overview }: { overview: TenantOverview }) {
  const { usage, subscription } = overview;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Activité</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <InfoField label="Formations">
              {formatNumber(usage.courses)} ({formatNumber(usage.publishedCourses)} publiée(s))
            </InfoField>
            <InfoField label="Apprenants actifs">{formatNumber(usage.activeLearners)}</InfoField>
            <InfoField label="Comptes apprenants">{formatNumber(usage.totalLearners)}</InfoField>
            <InfoField label="Crédits IA">{formatNumber(usage.creditsBalance)}</InfoField>
            <InfoField label="Dernière activité">{formatDateTime(usage.lastActivityAt)}</InfoField>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quotas du plan</CardTitle>
          <CardDescription>
            {subscription.current
              ? `Plan « ${subscription.current.planName} » : usage actuel face aux limites. Orange à partir de 80 %, rouge à 100 %.`
              : "Aucun abonnement actif : aucun quota ne s’applique pour l’instant."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {usage.quotas.map((quota) => {
              const tone = quotaTone(quota.percent);
              return (
                <li key={quota.key} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{quota.label}</span>
                    <span className="tabular-nums text-muted-foreground">{formatQuotaValue(quota)}</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={quota.label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={quota.percent === null ? undefined : Math.min(quota.percent, 100)}
                  >
                    <div
                      className={`h-full rounded-full ${BAR_CLASSES[tone]}`}
                      style={{ width: `${quota.percent === null ? 0 : Math.min(quota.percent, 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
