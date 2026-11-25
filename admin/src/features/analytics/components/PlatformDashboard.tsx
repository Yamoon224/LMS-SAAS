"use client";

import { PeriodFilter } from "./PeriodFilter";
import { formatPeriod, PlatformKpiGrid } from "./PlatformKpiGrid";
import { PlatformTrendsCharts } from "./PlatformTrendsSection";

import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { usePeriodFilter } from "@/features/analytics/hooks/usePeriodFilter";
import { usePlatformDashboard } from "@/features/analytics/hooks/usePlatformDashboard";

export function PlatformDashboardView() {
  const period = usePeriodFilter("month");
  const { data, isLoading, isError, error, refetch } = usePlatformDashboard({
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
        <ErrorBanner
          title="Impossible de charger le tableau de bord."
          error={error}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {data && (
            <p className="text-sm text-muted-foreground">
              Période : {formatPeriod(data.periodStart, data.periodEnd)}
            </p>
          )}
          <PlatformKpiGrid data={data} isLoading={isLoading} />
          <section aria-labelledby="analytics-trends-title" className="flex flex-col gap-3">
            <h2 id="analytics-trends-title" className="text-lg font-semibold">
              Évolution sur la période
            </h2>
            <PlatformTrendsCharts range={{ from: period.applied.from ?? "", to: period.applied.to ?? "" }} />
          </section>
        </>
      )}
    </div>
  );
}
