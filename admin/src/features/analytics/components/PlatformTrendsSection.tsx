"use client";

import { useMemo, useState } from "react";

import { usePlatformTrends } from "../hooks/usePlatformTrends";
import { rangeForPreset, toDateInput } from "../schemas/analytics.schema";

import { formatBucket, formatNumber } from "@/components/charts/chart-utils";
import { ChartCard, ChartLegend } from "@/components/charts/ChartCard";
import { DonutChart } from "@/components/charts/DonutChart";
import { TimeAreaChart, TimeBarChart } from "@/components/charts/TimeCharts";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PERIODS = [
  { id: "30d", label: "30 jours" },
  { id: "3m", label: "3 mois" },
  { id: "6m", label: "6 mois" },
  { id: "12m", label: "12 mois" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

/** Bornes de la période : 30 jours glissants (courbe journalière) ou N mois calendaires (courbe mensuelle). */
function rangeFor(id: PeriodId): { from: string; to: string } {
  if (id === "30d") {
    const range = rangeForPreset("30d");
    return { from: range.from ?? "", to: range.to ?? "" };
  }
  const months = id === "3m" ? 3 : id === "6m" ? 6 : 12;
  const now = new Date();
  return { from: toDateInput(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)), to: toDateInput(now) };
}

/** Une couleur par entité (jamais par rang) : les séries gardent leur couleur d'un graphique à l'autre. */
const COLOR = {
  commission: "var(--series-1)",
  tenants: "var(--series-2)",
  enrollments: "var(--series-3)",
  certificates: "var(--series-4)",
} as const;

const TENANT_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Actives", color: "var(--series-3)" },
  DRAFT: { label: "Brouillons", color: "var(--series-4)" },
  SUSPENDED: { label: "Suspendues", color: "var(--series-2)" },
  ARCHIVED: { label: "Archivées", color: "var(--series-7)" },
};

const SUBSCRIPTION_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Actifs", color: "var(--series-3)" },
  TRIALING: { label: "En essai", color: "var(--series-1)" },
  GRACE_PERIOD: { label: "Période de grâce", color: "var(--series-4)" },
  PENDING_PAYMENT: { label: "Paiement en attente", color: "var(--series-5)" },
  SUSPENDED: { label: "Suspendus", color: "var(--series-2)" },
  EXPIRED: { label: "Expirés", color: "var(--series-7)" },
  CANCELED: { label: "Résiliés", color: "var(--series-8)" },
};

function slicesOf(rows: { status: string; count: number }[], labels: Record<string, { label: string; color: string }>) {
  return rows.map((row) => ({
    label: labels[row.status]?.label ?? row.status,
    value: row.count,
    color: labels[row.status]?.color ?? "var(--series-6)",
  }));
}

/** Les graphiques (aire, colonnes, anneaux) d'une période donnée : partagés par l'accueil et la page Analytique. */
export function PlatformTrendsCharts({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading, isError, error, refetch } = usePlatformTrends(range);

  if (isError) {
    return <ErrorBanner title="Impossible de charger les graphiques." error={error} onRetry={() => void refetch()} />;
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-72 w-full" />
        ))}
      </div>
    );
  }

  const { granularity, points, currency } = data;
  const buckets = points.map((point) => point.bucket);
  const bucketLabel = (bucket: string) => formatBucket(bucket, granularity, true);
  const money = (value: number) => `${formatNumber(value)} ${currency}`;
  const sum = (pick: (point: (typeof points)[number]) => number) => points.reduce((total, point) => total + pick(point), 0);

  const tenantSlices = slicesOf(data.tenantsByStatus, TENANT_STATUS);
  const subscriptionSlices = slicesOf(data.subscriptionsByStatus, SUBSCRIPTION_STATUS);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Commissions de la plateforme"
          description={`${money(sum((point) => point.commissionRevenue))} sur la période`}
          table={{
            columns: ["Période", `Commissions (${currency})`],
            rows: points.map((point) => [bucketLabel(point.bucket), formatNumber(point.commissionRevenue)]),
          }}
        >
          <TimeAreaChart
            ariaLabel="Commissions de la plateforme au fil du temps"
            buckets={buckets}
            granularity={granularity}
            series={[{ label: "Commissions", color: COLOR.commission }]}
            values={[points.map((point) => point.commissionRevenue)]}
            formatValue={money}
          />
        </ChartCard>

        <ChartCard
          title="Nouvelles entreprises"
          description={`${formatNumber(sum((point) => point.newTenants))} sur la période`}
          table={{
            columns: ["Période", "Nouvelles entreprises"],
            rows: points.map((point) => [bucketLabel(point.bucket), point.newTenants]),
          }}
        >
          <TimeBarChart
            ariaLabel="Nouvelles entreprises au fil du temps"
            buckets={buckets}
            granularity={granularity}
            series={[{ label: "Nouvelles entreprises", color: COLOR.tenants }]}
            values={[points.map((point) => point.newTenants)]}
          />
        </ChartCard>

        <ChartCard
          title="Inscriptions et certificats"
          description={`${formatNumber(sum((point) => point.enrollments))} inscriptions · ${formatNumber(sum((point) => point.certificates))} certificats`}
          legend={
            <ChartLegend
              items={[
                { label: "Inscriptions", color: COLOR.enrollments },
                { label: "Certificats délivrés", color: COLOR.certificates },
              ]}
            />
          }
          className="lg:col-span-2"
          table={{
            columns: ["Période", "Inscriptions", "Certificats délivrés"],
            rows: points.map((point) => [bucketLabel(point.bucket), point.enrollments, point.certificates]),
          }}
        >
          <TimeBarChart
            ariaLabel="Inscriptions et certificats délivrés au fil du temps"
            buckets={buckets}
            granularity={granularity}
            series={[
              { label: "Inscriptions", color: COLOR.enrollments },
              { label: "Certificats délivrés", color: COLOR.certificates },
            ]}
            values={[points.map((point) => point.enrollments), points.map((point) => point.certificates)]}
          />
        </ChartCard>

        <ChartCard
          title="Entreprises par statut"
          description="Situation actuelle"
          table={{ columns: ["Statut", "Entreprises"], rows: tenantSlices.map((slice) => [slice.label, slice.value]) }}
        >
          <DonutChart slices={tenantSlices} totalLabel="entreprises" ariaLabel="Répartition des entreprises par statut" />
        </ChartCard>

        <ChartCard
          title="Abonnements par statut"
          description="Situation actuelle"
          table={{ columns: ["Statut", "Abonnements"], rows: subscriptionSlices.map((slice) => [slice.label, slice.value]) }}
        >
          <DonutChart slices={subscriptionSlices} totalLabel="abonnements" ariaLabel="Répartition des abonnements par statut" />
        </ChartCard>
      </div>
  );
}

/** Évolution dans le temps (aire, colonnes) et répartitions (anneaux) de l'activité de la plateforme. */
export function PlatformTrendsSection() {
  const [period, setPeriod] = useState<PeriodId | "custom">("6m");
  // Dates saisies pour la période personnalisée ; `applied` ne change que si elles forment une période valide.
  const [custom, setCustom] = useState(() => rangeFor("6m"));
  const [customApplied, setCustomApplied] = useState(custom);
  const today = toDateInput(new Date());
  const customInvalid = custom.from === "" || custom.to === "" || custom.from > custom.to;

  const range = useMemo(() => (period === "custom" ? customApplied : rangeFor(period)), [period, customApplied]);
  function editCustom(next: { from: string; to: string }) {
    setCustom(next);
    if (next.from !== "" && next.to !== "" && next.from <= next.to) setCustomApplied(next);
  }

  function choosePreset(id: PeriodId) {
    setPeriod(id);
    setCustom(rangeFor(id));
    setCustomApplied(rangeFor(id));
  }

  const buttonClass = (active: boolean) =>
    cn(
      "rounded px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
    );

  const heading = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="trends-title" className="text-lg font-semibold">
          Évolution
        </h2>
        <div role="group" aria-label="Période des graphiques" className="inline-flex flex-wrap rounded-md border border-border bg-surface p-0.5">
          {PERIODS.map((item) => (
            <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => choosePreset(item.id)} className={buttonClass(period === item.id)}>
              {item.label}
            </button>
          ))}
          <button type="button" aria-pressed={period === "custom"} onClick={() => setPeriod("custom")} className={buttonClass(period === "custom")}>
            Personnalisée
          </button>
        </div>
      </div>
      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-3 self-end">
          <div className="flex flex-col gap-1">
            <Label htmlFor="trends-from" className="text-xs text-muted-foreground">
              Du
            </Label>
            <Input
              id="trends-from"
              type="date"
              value={custom.from}
              max={custom.to || today}
              onChange={(event) => editCustom({ ...custom, from: event.target.value })}
              aria-invalid={customInvalid}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="trends-to" className="text-xs text-muted-foreground">
              Au
            </Label>
            <Input
              id="trends-to"
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              max={today}
              onChange={(event) => editCustom({ ...custom, to: event.target.value })}
              aria-invalid={customInvalid}
              className="w-40"
            />
          </div>
          {customInvalid && (
            <p role="alert" className="pb-2 text-xs text-danger">
              Choisissez un début antérieur ou égal à la fin.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section aria-labelledby="trends-title" className="flex flex-col gap-3">
      {heading}
      <PlatformTrendsCharts range={range} />
    </section>
  );
}
