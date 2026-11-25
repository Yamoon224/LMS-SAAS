import { z } from "zod";

/** GET /business/analytics/dashboard (GetBusinessDashboardUseCase) : instantané, pas de série temporelle. */
export const businessDashboardSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  activeLearnersCount: z.number(),
  newEnrollmentsCount: z.number(),
  completedEnrollmentsCount: z.number(),
  completionRatePercent: z.number(),
  grossRevenue: z.number(),
  netRevenue: z.number(),
  currency: z.string(),
  certificatesIssuedCount: z.number(),
  topCourses: z.array(
    z.object({
      courseId: z.string(),
      title: z.string(),
      enrollmentsCount: z.number(),
    }),
  ),
});
export type BusinessDashboard = z.infer<typeof businessDashboardSchema>;

export type PeriodPreset = "today" | "7d" | "30d" | "90d" | "month" | "lastMonth" | "year" | "custom";
export type FixedPeriodPreset = Exclude<PeriodPreset, "custom">;

/** Ordre d'affichage des raccourcis de période. */
export const PERIOD_PRESETS: readonly FixedPeriodPreset[] = ["today", "7d", "30d", "90d", "month", "lastMonth", "year"];

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Aujourd’hui",
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
  month: "Ce mois-ci",
  lastMonth: "Mois dernier",
  year: "Cette année",
  custom: "Personnalisée",
};

export interface PeriodRange {
  /** Dates locales au format YYYY-MM-DD (null = défaut serveur : début du mois → maintenant). */
  from: string | null;
  to: string | null;
}

/** Jour local au format YYYY-MM-DD (valeur d'un `<input type="date">`). */
export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const LAST_DAYS: Partial<Record<FixedPeriodPreset, number>> = { "7d": 7, "30d": 30, "90d": 90 };

/** Convertit un préréglage en bornes calendaires (jours locaux, bornes incluses). */
export function rangeForPreset(preset: FixedPeriodPreset, now = new Date()): PeriodRange {
  const today = toDateInput(now);
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === "today") return { from: today, to: today };
  if (preset === "month") return { from: toDateInput(new Date(year, month, 1)), to: today };
  if (preset === "lastMonth") {
    return { from: toDateInput(new Date(year, month - 1, 1)), to: toDateInput(new Date(year, month, 0)) };
  }
  if (preset === "year") return { from: toDateInput(new Date(year, 0, 1)), to: today };

  // « N derniers jours » = N jours calendaires, aujourd'hui compris.
  const from = new Date(now);
  from.setDate(from.getDate() - ((LAST_DAYS[preset] ?? 1) - 1));
  return { from: toDateInput(from), to: today };
}

/** Retrouve le raccourci qui correspond exactement à deux dates saisies (sinon « personnalisée »). */
export function detectPreset(from: string, to: string, now = new Date()): PeriodPreset {
  const match = PERIOD_PRESETS.find((preset) => {
    const range = rangeForPreset(preset, now);
    return range.from === from && range.to === to;
  });
  return match ?? "custom";
}
