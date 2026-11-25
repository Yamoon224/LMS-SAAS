import type { RawStorageRow, RawWebhookCount } from "./platform-health";

/** Lecture seule des données de santé technique (ADM-35). */
export interface PlatformHealthRepositoryPort {
  /** Issues des webhooks de paiement reçus depuis `since`, par fournisseur. */
  getWebhookCounts(since: Date): Promise<RawWebhookCount[]>;
  /** Taille cumulée des fichiers téléversés par entreprise (originaux). */
  getStorageByTenant(): Promise<RawStorageRow[]>;
}

export const PLATFORM_HEALTH_REPOSITORY = Symbol("PLATFORM_HEALTH_REPOSITORY");
