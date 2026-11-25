import { z } from "zod";

export const alertSeveritySchema = z.enum(["CRITICAL", "WARNING", "INFO"]);
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;

/** Doit rester cohérent avec AdminAlert (backend/.../analytics/domain/admin-alerts.ts). */
export const adminAlertSchema = z.object({
  type: z.string(),
  severity: alertSeveritySchema,
  title: z.string(),
  detail: z.string(),
  count: z.number(),
  href: z.string(),
});
export type AdminAlert = z.infer<typeof adminAlertSchema>;

export const adminAlertsSchema = z.object({
  generatedAt: z.coerce.date(),
  criticalCount: z.number(),
  alerts: z.array(adminAlertSchema),
});
export type AdminAlertsReport = z.infer<typeof adminAlertsSchema>;

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  CRITICAL: "Critique",
  WARNING: "À surveiller",
  INFO: "Information",
};

export const ALERT_SEVERITY_VARIANTS: Record<AlertSeverity, "danger" | "warning" | "info"> = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "info",
};

/** Nombre d'alertes par sévérité (résumé affiché au-dessus de la liste). */
export function countBySeverity(alerts: readonly AdminAlert[]): Record<AlertSeverity, number> {
  const counts: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  for (const alert of alerts) counts[alert.severity] += 1;
  return counts;
}

/** Un lien d'action n'est suivi que s'il reste interne au back-office (chemin absolu, jamais `//` ni un schéma). */
export function safeAlertHref(href: string): string {
  return /^\/(?!\/)/.test(href) ? href : "/";
}
