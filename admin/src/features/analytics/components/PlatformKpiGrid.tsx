import {
  Award,
  BookOpen,
  Bot,
  Building2,
  CalendarRange,
  CirclePause,
  Hourglass,
  Percent,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PlatformDashboard } from "../schemas/analytics.schema";

import { StatCard } from "@/components/ui/stat-card";
import { cardSpans } from "@/lib/card-grid";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("fr-FR");
const amount = (value: number, currency: string) => `${number.format(value)} ${currency}`;

export function formatPeriod(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
  return `${formatter.format(start)} — ${formatter.format(end)}`;
}

export interface KpiCard {
  key: string;
  label: string;
  value?: string;
  hint?: string;
  icon: LucideIcon;
}

type Data = PlatformDashboard | undefined;

/** Indicateurs calculés sur la période demandée (mois, année ou plage choisie). */
export function periodCards(data: Data): KpiCard[] {
  return [
    { key: "new-tenants", label: "Nouvelles entreprises", value: data && number.format(data.newTenantsCount), icon: Sparkles },
    { key: "commission", label: "Commission plateforme", value: data && amount(data.platformCommissionRevenue, data.currency), icon: UserCheck },
    { key: "credits", label: "Revenus crédits IA", value: data && amount(data.creditRevenue, data.currency), hint: "Packs vendus", icon: Bot },
    { key: "certificates", label: "Certificats délivrés", value: data && number.format(data.certificatesIssuedCount), icon: Award },
    { key: "churn", label: "Taux de résiliation (churn)", value: data && `${data.churnRatePercent}%`, icon: Percent },
  ];
}

export const mrrCard = (data: Data): KpiCard => ({
  key: "mrr",
  label: "Revenu récurrent mensuel (MRR)",
  value: data && amount(data.monthlyRecurringRevenue, data.currency),
  icon: TrendingUp,
});

export const arrCard = (data: Data): KpiCard => ({
  key: "arr",
  label: "Revenu annuel récurrent (ARR)",
  value: data && amount(data.annualRecurringRevenue, data.currency),
  hint: "Approximation : MRR × 12",
  icon: CalendarRange,
});

/** Photographie à l'instant T : indépendante de la période choisie. */
export function currentCards(data: Data): KpiCard[] {
  return [
    {
      key: "active-tenants",
      label: "Entreprises actives",
      value: data && number.format(data.activeTenantsCount),
      icon: Building2,
    },
    { key: "trialing", label: "Entreprises en essai", value: data && number.format(data.trialingTenantsCount), icon: Hourglass },
    { key: "suspended", label: "Entreprises suspendues", value: data && number.format(data.suspendedTenantsCount), icon: CirclePause },
    { key: "learners", label: "Apprenants au total", value: data && number.format(data.totalLearnersCount), icon: Users },
    { key: "courses", label: "Formations au total", value: data && number.format(data.totalCoursesCount), icon: BookOpen },
  ];
}

/** Cartes d'un groupe, réparties en lignes équilibrées : aucune ligne n'est incomplète, chaque carte s'étire. */
export function KpiCards({ cards, isLoading }: { cards: KpiCard[]; isLoading?: boolean }) {
  const spans = cardSpans(cards.length);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {cards.map((card, index) => (
        <div key={card.key} className={cn("flex [&>*]:w-full", spans[index])}>
          <StatCard label={card.label} value={card.value} hint={card.hint} icon={card.icon} isLoading={isLoading} />
        </div>
      ))}
    </div>
  );
}

/** Groupe titré de cartes : « Ce mois-ci · novembre 2026 », « Cette année · 2026 »… */
export function KpiGroup({ title, qualifier, cards, isLoading }: { title: string; qualifier?: string; cards: KpiCard[]; isLoading?: boolean }) {
  return (
    <section aria-label={qualifier ? `${title} ${qualifier}` : title} className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">
        {title}
        {qualifier && <span className="ml-2 font-normal text-muted-foreground">· {qualifier}</span>}
      </h3>
      <KpiCards cards={cards} isLoading={isLoading} />
    </section>
  );
}

/** Page Analytique : trois groupes (état actuel, période choisie, revenus récurrents), sans ligne incomplète. */
export function PlatformKpiGrid({ data, isLoading }: { data?: PlatformDashboard; isLoading?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <KpiGroup title="État actuel" cards={currentCards(data)} isLoading={isLoading} />
      <KpiGroup title="Sur la période" cards={periodCards(data)} isLoading={isLoading} />
      <KpiGroup title="Revenus récurrents" cards={[mrrCard(data), arrCard(data)]} isLoading={isLoading} />
    </div>
  );
}
