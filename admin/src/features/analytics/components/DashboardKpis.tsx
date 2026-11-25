"use client";

import { useMemo } from "react";

import { usePlatformDashboard } from "../hooks/usePlatformDashboard";
import { toDateInput } from "../schemas/analytics.schema";

import { arrCard, currentCards, KpiGroup, mrrCard, periodCards } from "./PlatformKpiGrid";

const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

/**
 * Indicateurs de l'accueil, regroupés par horizon : le mois en cours, l'année en cours (avec son millésime)
 * et l'état actuel. Chaque groupe remplit ses lignes sans trou.
 */
export function DashboardKpis() {
  const { month, year, ranges } = useMemo(() => {
    const now = new Date();
    return {
      month: monthName.format(now),
      year: String(now.getFullYear()),
      ranges: {
        month: { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) },
        year: { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: toDateInput(now) },
      },
    };
  }, []);

  const monthly = usePlatformDashboard(ranges.month);
  const yearly = usePlatformDashboard(ranges.year);

  return (
    <section aria-labelledby="kpi-title" className="flex flex-col gap-6">
      <h2 id="kpi-title" className="text-lg font-semibold">
        Indicateurs clés
      </h2>
      <KpiGroup
        title="Ce mois-ci"
        qualifier={month}
        cards={[mrrCard(monthly.data), ...periodCards(monthly.data)]}
        isLoading={monthly.isLoading}
      />
      <KpiGroup
        title="Cette année"
        qualifier={year}
        cards={[arrCard(yearly.data), ...periodCards(yearly.data)]}
        isLoading={yearly.isLoading}
      />
      <KpiGroup title="État actuel" cards={currentCards(monthly.data)} isLoading={monthly.isLoading} />
    </section>
  );
}
