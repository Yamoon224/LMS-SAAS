"use client";

import { Bot } from "lucide-react";

import { useAiConsumption } from "../hooks/useAiConsumption";
import type { AiConsumption, TenantAiConsumption } from "../schemas/ai-consumption.schema";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { StatCard } from "@/components/ui/stat-card";
import { PeriodFilter } from "@/features/analytics/components/PeriodFilter";
import { usePeriodFilter } from "@/features/analytics/hooks/usePeriodFilter";
import { formatDate, formatNumber } from "@/lib/format";

/** Montant en unité de la devise ; « non configuré » quand la donnée n'existe pas (jamais 0 par défaut). */
function amountOrNotConfigured(value: number | null): string {
  return value === null ? "Non configuré" : formatNumber(Math.round(value));
}

const COLUMNS: DataTableColumn<TenantAiConsumption>[] = [
  {
    id: "tenant",
    header: "Entreprise",
    accessor: (tenant) => tenant.tenantName,
    exportValue: (tenant) => tenant.tenantName,
    cell: (tenant) => <span className="font-medium">{tenant.tenantName}</span>,
    mobile: "primary",
  },
  {
    id: "credits",
    header: "Crédits consommés",
    accessor: (tenant) => tenant.creditsConsumed,
    exportValue: (tenant) => tenant.creditsConsumed,
    cell: (tenant) => formatNumber(tenant.creditsConsumed),
    mobile: "secondary",
  },
  {
    id: "jobs",
    header: "Tâches",
    accessor: (tenant) => tenant.jobsCount,
    exportValue: (tenant) => tenant.jobsCount,
    cell: (tenant) => (
      <span>
        {tenant.jobsCount}
        <span className="text-xs text-muted-foreground">
          {" "}
          ({tenant.completedJobs} terminées, {tenant.failedJobs} échouées)
        </span>
      </span>
    ),
  },
  {
    id: "words",
    header: "Mots traduits",
    accessor: (tenant) => tenant.wordsTranslated,
    exportValue: (tenant) => tenant.wordsTranslated,
    cell: (tenant) => formatNumber(tenant.wordsTranslated),
  },
  {
    id: "cost",
    header: "Coût fournisseur estimé",
    accessor: (tenant) => tenant.providerCostEstimate ?? -1,
    exportValue: (tenant) => tenant.providerCostEstimate ?? "",
    cell: (tenant) => amountOrNotConfigured(tenant.providerCostEstimate),
  },
];

function Summary({ data }: { data: AiConsumption }) {
  const { totals } = data;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Crédits consommés"
        value={formatNumber(totals.creditsConsumed)}
        hint={`${totals.completedJobs} tâche(s) terminée(s) sur ${totals.jobsCount}`}
        icon={Bot}
      />
      <StatCard label="Mots traduits" value={formatNumber(totals.wordsTranslated)} hint="Tâches terminées" icon={Bot} />
      <StatCard
        label="Coût fournisseur estimé"
        value={amountOrNotConfigured(totals.providerCostEstimate)}
        hint={
          data.providerCostPerWord === null
            ? "Renseignez AI_TRANSLATION_COST_PER_WORD côté serveur"
            : `${data.providerCostPerWord} par mot`
        }
        icon={Bot}
      />
      <StatCard
        label="Marge estimée"
        value={amountOrNotConfigured(totals.marginEstimate)}
        hint={
          totals.creditsValueEstimate === null
            ? "Aucune vente de pack : valeur d'un crédit inconnue"
            : `Valeur des crédits : ${formatNumber(Math.round(totals.creditsValueEstimate))}`
        }
        icon={Bot}
      />
    </div>
  );
}

/** ADM-34 : consommation IA par entreprise sur une période, avec coût fournisseur et marge estimés. */
export function AiConsumptionPage() {
  const period = usePeriodFilter("month");
  const { data, isLoading, isError, error, refetch } = useAiConsumption({
    from: period.applied.from ?? "",
    to: period.applied.to ?? "",
  });

  if (isError && isForbidden(error)) return <AccessDenied />;

  return (
    <div className="flex flex-col gap-6">
      <PeriodFilter
        state={period.state}
        invalid={period.invalid}
        isDefault={period.state.preset === "month"}
        onPresetChange={period.selectPreset}
        onCustom={period.selectCustom}
        onFromChange={period.setFrom}
        onToChange={period.setTo}
        onReset={period.reset}
      />
      {isError ? (
        <ErrorBanner title="Impossible de charger la consommation IA." error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          {data && (
            <>
              <p className="text-sm text-muted-foreground">
                Période : {formatDate(data.periodStart)} – {formatDate(data.periodEnd)}
              </p>
              <Summary data={data} />
            </>
          )}
          <DataTable
            data={data?.tenants}
            columns={COLUMNS}
            getRowId={(tenant) => tenant.tenantId}
            isLoading={isLoading}
            title="consommation IA"
            stateKey="ai-consumption"
            searchPlaceholder="Rechercher une entreprise…"
            initialSort={{ columnId: "credits", direction: "desc" }}
            emptyState={<EmptyState icon={Bot} message="Aucune traduction IA sur cette période." />}
          />
          <p className="text-xs text-muted-foreground">
            Coût et marge sont des estimations : le coût vient du tarif par mot configuré côté serveur, la valeur d&apos;un
            crédit du prix moyen des packs vendus. Les crédits d&apos;une tâche échouée sont remboursés et ne comptent pas.
          </p>
        </>
      )}
    </div>
  );
}
