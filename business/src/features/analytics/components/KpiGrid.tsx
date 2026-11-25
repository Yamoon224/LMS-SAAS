import { Award, Banknote, CheckCircle2, GraduationCap, UserPlus, Wallet } from "lucide-react";

import type { BusinessDashboard } from "../schemas/analytics.schema";

import { StatCard } from "@/components/ui/stat-card";
import { formatAmount } from "@/lib/format";

interface KpiGridProps {
  data?: BusinessDashboard;
  isLoading: boolean;
  /** Version réduite (accueil) : 4 tuiles. */
  compact?: boolean;
}

/** Tuiles KPI du tableau de bord entreprise (partagées avec l'accueil). */
export function KpiGrid({ data, isLoading, compact = false }: KpiGridProps) {
  const number = (value?: number) => (value === undefined ? undefined : value.toLocaleString("fr-FR"));

  return (
    <div className={`grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 ${compact ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      <StatCard
        label="Inscriptions actives"
        value={number(data?.activeLearnersCount)}
        hint="Accès actuellement actifs"
        icon={GraduationCap}
        isLoading={isLoading}
      />
      <StatCard
        label="Nouvelles inscriptions"
        value={number(data?.newEnrollmentsCount)}
        hint="Sur la période"
        icon={UserPlus}
        isLoading={isLoading}
      />
      <StatCard
        label="Taux de complétion"
        value={data ? `${data.completionRatePercent.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : undefined}
        hint={data ? `${data.completedEnrollmentsCount.toLocaleString("fr-FR")} terminée(s)` : undefined}
        icon={CheckCircle2}
        isLoading={isLoading}
      />
      <StatCard
        label="Revenu net"
        value={data ? formatAmount(data.netRevenue, data.currency) : undefined}
        hint="Après commission"
        icon={Wallet}
        isLoading={isLoading}
      />
      {!compact && (
        <>
          <StatCard
            label="Revenu brut"
            value={data ? formatAmount(data.grossRevenue, data.currency) : undefined}
            hint="Paiements encaissés"
            icon={Banknote}
            isLoading={isLoading}
          />
          <StatCard
            label="Certificats délivrés"
            value={number(data?.certificatesIssuedCount)}
            hint="Sur la période"
            icon={Award}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
