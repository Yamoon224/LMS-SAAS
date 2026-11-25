/** Issue du traitement d'un webhook de paiement (ADM-35). Doit rester cohérent avec l'enum Prisma WebhookOutcome. */
export type WebhookOutcome = "PROCESSED" | "DUPLICATE" | "UNKNOWN_REFERENCE" | "INVALID_SIGNATURE" | "ERROR";

/**
 * Journal minimal des webhooks reçus : fournisseur, issue, date. Jamais de contenu (le corps brut peut contenir des
 * données de paiement) : il ne sert qu'à mesurer le taux d'erreur par fournisseur.
 */
export interface WebhookEventLogPort {
  /**
   * `providerReference` (étape 30) : référence du paiement chez le fournisseur, extraite APRÈS validation de la
   * signature ; absente quand la signature est invalide. Seule donnée conservée pour permettre un rejeu.
   */
  record(providerCode: string, outcome: WebhookOutcome, providerReference?: string): Promise<void>;
  findById(id: string): Promise<WebhookEventRecord | null>;
  /** Webhooks en échec (ERROR) ou sans paiement connu (UNKNOWN_REFERENCE) non résolus, du plus récent au plus ancien. */
  listUnresolvedFailures(limit: number): Promise<WebhookEventRecord[]>;
  /** Marque un webhook comme résolu (un rejeu a abouti). Idempotent. */
  markResolved(id: string): Promise<void>;
}

export interface WebhookEventRecord {
  id: string;
  providerCode: string;
  outcome: WebhookOutcome;
  receivedAt: Date;
  providerReference: string | null;
  resolvedAt: Date | null;
}

export const WEBHOOK_EVENT_LOG = Symbol("WEBHOOK_EVENT_LOG");
