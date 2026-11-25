/**
 * ADM-35 : santé technique — état des files de tâches, taux d'erreur des webhooks de paiement, espace de stockage.
 * Fonctions pures (section 13.1) : l'infrastructure fournit les comptages bruts, le domaine les interprète.
 */

export type HealthStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "NO_DATA";

/** Au-delà de ce nombre de tâches en attente (ou différées), une file est considérée comme engorgée. */
export const QUEUE_BACKLOG_ALERT = 100;
/** Taux d'erreur des webhooks (en %) à partir duquel un fournisseur est considéré comme dégradé. */
export const WEBHOOK_ERROR_RATE_ALERT_PERCENT = 20;
/** Sous ce nombre d'événements, un taux d'erreur n'est pas significatif (un échec sur deux événements = 50 %). */
export const WEBHOOK_MIN_SAMPLE = 5;
export const WEBHOOK_WINDOW_HOURS = 24;
export const STORAGE_TOP_TENANTS = 5;

export interface QueueCounts {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  paused: number;
}

export interface QueueHealth {
  name: string;
  /** false si la file est injoignable (ex. Redis arrêté) : on le signale au lieu de faire échouer toute la page. */
  available: boolean;
  counts: QueueCounts | null;
  status: HealthStatus;
}

export function assessQueue(name: string, counts: QueueCounts | null): QueueHealth {
  if (counts === null) return { name, available: false, counts: null, status: "DOWN" };
  const degraded = counts.failed > 0 || counts.waiting + counts.delayed > QUEUE_BACKLOG_ALERT;
  return { name, available: true, counts, status: degraded ? "DEGRADED" : "HEALTHY" };
}

/** Doit rester cohérent avec l'enum Prisma WebhookOutcome. */
export type WebhookOutcomeValue = "PROCESSED" | "DUPLICATE" | "UNKNOWN_REFERENCE" | "INVALID_SIGNATURE" | "ERROR";

/** Issues comptées comme des erreurs : signature invalide, référence inconnue, exception pendant le traitement. */
export const WEBHOOK_FAILURE_OUTCOMES: readonly WebhookOutcomeValue[] = ["INVALID_SIGNATURE", "UNKNOWN_REFERENCE", "ERROR"];

export interface RawWebhookCount {
  providerCode: string;
  outcome: WebhookOutcomeValue;
  count: number;
}

export interface ProviderWebhookHealth {
  providerCode: string;
  total: number;
  failed: number;
  errorRatePercent: number;
  status: HealthStatus;
}

export interface WebhookHealth {
  windowHours: number;
  total: number;
  failed: number;
  errorRatePercent: number;
  status: HealthStatus;
  providers: ProviderWebhookHealth[];
}

function rate(failed: number, total: number): number {
  return total === 0 ? 0 : Math.round((failed / total) * 1000) / 10;
}

function webhookStatus(total: number, errorRatePercent: number): HealthStatus {
  if (total === 0) return "NO_DATA";
  if (total >= WEBHOOK_MIN_SAMPLE && errorRatePercent >= WEBHOOK_ERROR_RATE_ALERT_PERCENT) return "DEGRADED";
  return "HEALTHY";
}

export function summarizeWebhooks(rows: readonly RawWebhookCount[]): WebhookHealth {
  const byProvider = new Map<string, { total: number; failed: number }>();
  for (const row of rows) {
    const entry = byProvider.get(row.providerCode) ?? { total: 0, failed: 0 };
    entry.total += row.count;
    if (WEBHOOK_FAILURE_OUTCOMES.includes(row.outcome)) entry.failed += row.count;
    byProvider.set(row.providerCode, entry);
  }

  const providers = [...byProvider.entries()]
    .map(([providerCode, { total, failed }]): ProviderWebhookHealth => {
      const errorRatePercent = rate(failed, total);
      return { providerCode, total, failed, errorRatePercent, status: webhookStatus(total, errorRatePercent) };
    })
    .sort((a, b) => a.providerCode.localeCompare(b.providerCode));

  const total = providers.reduce((sum, provider) => sum + provider.total, 0);
  const failed = providers.reduce((sum, provider) => sum + provider.failed, 0);
  const errorRatePercent = rate(failed, total);
  const anyDegraded = providers.some((provider) => provider.status === "DEGRADED");
  return {
    windowHours: WEBHOOK_WINDOW_HOURS,
    total,
    failed,
    errorRatePercent,
    status: total === 0 ? "NO_DATA" : anyDegraded ? "DEGRADED" : "HEALTHY",
    providers,
  };
}

export interface RawStorageRow {
  tenantId: string;
  tenantName: string;
  bytes: number;
  assets: number;
}

export interface StorageHealth {
  totalBytes: number;
  assetsCount: number;
  tenantsCount: number;
  /** Entreprises les plus consommatrices. */
  topTenants: RawStorageRow[];
}

/** Stockage global : somme des fichiers téléversés (originaux), et entreprises les plus consommatrices. */
export function summarizeStorage(rows: readonly RawStorageRow[]): StorageHealth {
  const sorted = [...rows].sort((a, b) => b.bytes - a.bytes || a.tenantName.localeCompare(b.tenantName));
  return {
    totalBytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    assetsCount: rows.reduce((sum, row) => sum + row.assets, 0),
    tenantsCount: rows.length,
    topTenants: sorted.slice(0, STORAGE_TOP_TENANTS),
  };
}

const SEVERITY: Record<HealthStatus, number> = { NO_DATA: 0, HEALTHY: 1, DEGRADED: 2, DOWN: 3 };

/** État global : le plus grave des composants ; « pas de données » ne dégrade rien. */
export function overallStatus(statuses: readonly HealthStatus[]): HealthStatus {
  const worst = statuses.reduce<HealthStatus>((acc, status) => (SEVERITY[status] > SEVERITY[acc] ? status : acc), "NO_DATA");
  return worst === "NO_DATA" ? "HEALTHY" : worst;
}
