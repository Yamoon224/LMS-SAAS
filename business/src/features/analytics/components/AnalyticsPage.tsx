"use client";

import { useBusinessDashboard } from "../hooks/useBusinessDashboard";
import { usePeriodFilter } from "../hooks/usePeriodFilter";

import { KpiGrid } from "./KpiGrid";
import { PeriodFilter } from "./PeriodFilter";
import { TopCourses } from "./TopCourses";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

/** Analytique entreprise : KPI de la période choisie + formations phares. */
export function AnalyticsPage() {
  const period = usePeriodFilter("month");
  const { data, isLoading, isError, error, refetch, isFetching } = useBusinessDashboard(period.applied);

  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytique"
        description="Suivez l’activité de votre entreprise : inscriptions, complétion, revenus et certificats."
      />

      <PeriodFilter
        state={period.state}
        invalid={period.invalid}
        isDefault={period.state.preset === "month"}
        onPresetChange={period.selectPreset}
        onFromChange={period.setFrom}
        onToChange={period.setTo}
        onReset={period.reset}
      />

      {isError && (
        <ErrorBanner
          title={forbidden ? "Accès refusé à l’analytique." : "Impossible de charger les indicateurs."}
          error={forbidden ? new Error("Le droit « analytics.view » est requis pour votre rôle.") : error}
          onRetry={forbidden ? undefined : () => void refetch()}
        />
      )}

      {!isError && (
        <>
          <div aria-busy={isFetching}>
            <KpiGrid data={data} isLoading={isLoading} />
          </div>
          {data && (
            <p className="-mt-3 text-xs text-muted-foreground">
              Période du {formatDate(data.periodStart)} au {formatDate(data.periodEnd)}. « Inscriptions actives » est
              un instantané (accès actifs aujourd’hui), indépendant de la période.
            </p>
          )}
          <TopCourses courses={data?.topCourses} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}
