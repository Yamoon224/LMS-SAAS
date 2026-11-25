/**
 * ADM-03 : alertes de l'Admin plateforme. Fonctions pures (section 13.1) : l'infrastructure fournit des comptages
 * bruts (agrégats, jamais de lignes détaillées), le domaine applique les seuils et décide de la sévérité.
 */

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export type AlertType =
  | "FAILED_PAYMENTS"
  | "SUBSCRIPTIONS_EXPIRING"
  | "SUBSCRIPTIONS_GRACE"
  | "SUBSCRIPTIONS_EXPIRED"
  | "PAYOUTS_PENDING"
  | "REFUNDS_PENDING"
  | "TENANTS_SUSPENDED"
  | "WEBHOOK_FAILURES"
  | "AI_CONSUMPTION_ANOMALY"
  | "MEDIA_ANALYSIS_FAILED";

/** Paiements échoués : fenêtre d'observation, et nombre à partir duquel l'alerte devient critique. */
export const FAILED_PAYMENTS_WINDOW_DAYS = 7;
export const FAILED_PAYMENTS_CRITICAL_THRESHOLD = 10;
/** Abonnements : échéance proche, fenêtre des expirations récentes, seuil critique d'expirations. */
export const SUBSCRIPTION_EXPIRY_WINDOW_DAYS = 7;
export const SUBSCRIPTION_EXPIRED_WINDOW_DAYS = 30;
export const SUBSCRIPTIONS_EXPIRED_CRITICAL_THRESHOLD = 5;
/** Une demande de reversement ou de remboursement en attente depuis plus longtemps devient critique. */
export const PENDING_PAYOUT_CRITICAL_AGE_DAYS = 3;
export const PENDING_REFUND_CRITICAL_AGE_DAYS = 3;
/** Webhooks en échec non résolus : fenêtre (heures) et seuil critique. */
export const WEBHOOK_FAILURES_WINDOW_HOURS = 24;
export const WEBHOOK_FAILURES_CRITICAL_THRESHOLD = 10;
/** Médias refusés par l'antivirus ou en échec de traitement : fenêtre et seuil critique. */
export const MEDIA_FAILED_WINDOW_DAYS = 7;
export const MEDIA_FAILED_CRITICAL_THRESHOLD = 10;
/**
 * Consommation IA anormale : une entreprise qui consomme, sur 24 h, au moins `MIN_CREDITS` crédits ET `FACTOR` fois
 * sa moyenne quotidienne des `BASELINE_DAYS` jours précédents (sans historique : le plancher seul s'applique).
 */
export const AI_ANOMALY_WINDOW_HOURS = 24;
export const AI_ANOMALY_BASELINE_DAYS = 30;
export const AI_ANOMALY_MIN_CREDITS = 5000;
export const AI_ANOMALY_FACTOR = 5;
/** Nombre maximal d'entreprises citées dans le détail d'une anomalie IA. */
export const AI_ANOMALY_MAX_NAMED = 3;

export interface AdminAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  count: number;
  /** Route du back-office Admin où traiter l'alerte. */
  href: string;
}

export interface PendingBucket {
  count: number;
  /** Date de la plus ancienne demande en attente (null si aucune). */
  oldestAt: Date | null;
}

export interface RawAiTenantUsage {
  tenantId: string;
  tenantName: string;
  /** Crédits débités sur les dernières 24 h (valeur positive). */
  recentCredits: number;
  /** Crédits débités sur la période de référence (hors 24 h), valeur positive. */
  baselineCredits: number;
}

export interface RawAdminAlerts {
  failedPayments: number;
  subscriptionsExpiringSoon: number;
  subscriptionsInGrace: number;
  subscriptionsExpiredRecently: number;
  pendingPayouts: PendingBucket;
  pendingRefunds: PendingBucket;
  suspendedTenants: number;
  webhookFailures: number;
  aiUsage: RawAiTenantUsage[];
  mediaAnalysisFailed: number;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
const DAY_MS = 24 * 60 * 60 * 1000;

function plural(count: number, singular: string, pluralForm: string): string {
  return count > 1 ? pluralForm : singular;
}

function ageInDays(date: Date | null, now: Date): number {
  return date ? Math.floor((now.getTime() - date.getTime()) / DAY_MS) : 0;
}

/** Entreprises dont la consommation des dernières 24 h est anormale, plus fortes consommations d'abord. */
export function detectAiAnomalies(usage: readonly RawAiTenantUsage[]): RawAiTenantUsage[] {
  return usage
    .filter((row) => {
      if (row.recentCredits < AI_ANOMALY_MIN_CREDITS) return false;
      const dailyAverage = row.baselineCredits / AI_ANOMALY_BASELINE_DAYS;
      return dailyAverage === 0 || row.recentCredits >= dailyAverage * AI_ANOMALY_FACTOR;
    })
    .sort((a, b) => b.recentCredits - a.recentCredits);
}

/** Construit les alertes actives (compteur > 0), triées par sévérité puis par compteur décroissant. */
export function buildAdminAlerts(raw: RawAdminAlerts, now: Date = new Date()): AdminAlert[] {
  const alerts: AdminAlert[] = [];

  if (raw.failedPayments > 0) {
    alerts.push({
      type: "FAILED_PAYMENTS",
      severity: raw.failedPayments >= FAILED_PAYMENTS_CRITICAL_THRESHOLD ? "CRITICAL" : "WARNING",
      title: "Paiements échoués",
      detail: `${raw.failedPayments} ${plural(raw.failedPayments, "paiement a échoué", "paiements ont échoué")} sur les ${FAILED_PAYMENTS_WINDOW_DAYS} derniers jours.`,
      count: raw.failedPayments,
      href: "/transactions",
    });
  }

  if (raw.subscriptionsExpiredRecently > 0) {
    alerts.push({
      type: "SUBSCRIPTIONS_EXPIRED",
      severity: raw.subscriptionsExpiredRecently >= SUBSCRIPTIONS_EXPIRED_CRITICAL_THRESHOLD ? "CRITICAL" : "WARNING",
      title: "Abonnements expirés",
      detail: `${raw.subscriptionsExpiredRecently} ${plural(raw.subscriptionsExpiredRecently, "abonnement a expiré", "abonnements ont expiré")} sur les ${SUBSCRIPTION_EXPIRED_WINDOW_DAYS} derniers jours.`,
      count: raw.subscriptionsExpiredRecently,
      href: "/tenants",
    });
  }

  if (raw.subscriptionsInGrace > 0) {
    alerts.push({
      type: "SUBSCRIPTIONS_GRACE",
      severity: "WARNING",
      title: "Abonnements en période de grâce",
      detail: `${raw.subscriptionsInGrace} ${plural(raw.subscriptionsInGrace, "entreprise n'a pas réglé son renouvellement", "entreprises n'ont pas réglé leur renouvellement")} : l'accès sera coupé à la fin de la grâce.`,
      count: raw.subscriptionsInGrace,
      href: "/tenants",
    });
  }

  if (raw.subscriptionsExpiringSoon > 0) {
    alerts.push({
      type: "SUBSCRIPTIONS_EXPIRING",
      severity: "INFO",
      title: "Abonnements arrivant à échéance",
      detail: `${raw.subscriptionsExpiringSoon} ${plural(raw.subscriptionsExpiringSoon, "abonnement arrive", "abonnements arrivent")} à échéance dans les ${SUBSCRIPTION_EXPIRY_WINDOW_DAYS} prochains jours.`,
      count: raw.subscriptionsExpiringSoon,
      href: "/tenants",
    });
  }

  if (raw.pendingPayouts.count > 0) {
    const age = ageInDays(raw.pendingPayouts.oldestAt, now);
    alerts.push({
      type: "PAYOUTS_PENDING",
      severity: age >= PENDING_PAYOUT_CRITICAL_AGE_DAYS ? "CRITICAL" : "WARNING",
      title: "Reversements en attente",
      detail: `${raw.pendingPayouts.count} ${plural(raw.pendingPayouts.count, "reversement attend", "reversements attendent")} une validation ou une approbation (le plus ancien : ${age} j).`,
      count: raw.pendingPayouts.count,
      href: "/wallets",
    });
  }

  if (raw.pendingRefunds.count > 0) {
    const age = ageInDays(raw.pendingRefunds.oldestAt, now);
    alerts.push({
      type: "REFUNDS_PENDING",
      severity: age >= PENDING_REFUND_CRITICAL_AGE_DAYS ? "CRITICAL" : "WARNING",
      title: "Remboursements à traiter",
      detail: `${raw.pendingRefunds.count} ${plural(raw.pendingRefunds.count, "remboursement accepté attend", "remboursements acceptés attendent")} son exécution (le plus ancien : ${age} j).`,
      count: raw.pendingRefunds.count,
      href: "/refunds",
    });
  }

  if (raw.suspendedTenants > 0) {
    alerts.push({
      type: "TENANTS_SUSPENDED",
      severity: "INFO",
      title: "Entreprises suspendues",
      detail: `${raw.suspendedTenants} ${plural(raw.suspendedTenants, "entreprise est suspendue", "entreprises sont suspendues")}.`,
      count: raw.suspendedTenants,
      href: "/tenants",
    });
  }

  if (raw.webhookFailures > 0) {
    alerts.push({
      type: "WEBHOOK_FAILURES",
      severity: raw.webhookFailures >= WEBHOOK_FAILURES_CRITICAL_THRESHOLD ? "CRITICAL" : "WARNING",
      title: "Webhooks en échec",
      detail: `${raw.webhookFailures} ${plural(raw.webhookFailures, "webhook non résolu", "webhooks non résolus")} sur les ${WEBHOOK_FAILURES_WINDOW_HOURS} dernières heures : rejouez-les depuis le rapprochement.`,
      count: raw.webhookFailures,
      href: "/reconciliation",
    });
  }

  const anomalies = detectAiAnomalies(raw.aiUsage);
  if (anomalies.length > 0) {
    const named = anomalies.slice(0, AI_ANOMALY_MAX_NAMED).map((row) => row.tenantName);
    const more = anomalies.length - named.length;
    alerts.push({
      type: "AI_CONSUMPTION_ANOMALY",
      severity: "WARNING",
      title: "Consommation IA anormale",
      detail: `${named.join(", ")}${more > 0 ? ` et ${more} autre${more > 1 ? "s" : ""}` : ""} : consommation sur ${AI_ANOMALY_WINDOW_HOURS} h très supérieure à la normale.`,
      count: anomalies.length,
      href: "/ai-consumption",
    });
  }

  if (raw.mediaAnalysisFailed > 0) {
    alerts.push({
      type: "MEDIA_ANALYSIS_FAILED",
      severity: raw.mediaAnalysisFailed >= MEDIA_FAILED_CRITICAL_THRESHOLD ? "CRITICAL" : "WARNING",
      title: "Médias refusés ou en échec",
      detail: `${raw.mediaAnalysisFailed} ${plural(raw.mediaAnalysisFailed, "fichier a été refusé", "fichiers ont été refusés")} par l'analyse antivirus ou ${plural(raw.mediaAnalysisFailed, "a échoué", "ont échoué")} au traitement sur les ${MEDIA_FAILED_WINDOW_DAYS} derniers jours.`,
      count: raw.mediaAnalysisFailed,
      href: "/health",
    });
  }

  return alerts.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count,
  );
}

export interface AdminAlertsReport {
  generatedAt: Date;
  /** Nombre d'alertes critiques (pastille de la barre supérieure). */
  criticalCount: number;
  alerts: AdminAlert[];
}
