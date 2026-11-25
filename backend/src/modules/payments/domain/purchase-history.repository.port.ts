import type { PurchaseHistoryItem } from "./purchase-history";

/** Lecture seule : historique d'achats d'un apprenant (PUB-18). */
export interface PurchaseHistoryRepositoryPort {
  listForLearner(userId: string): Promise<PurchaseHistoryItem[]>;
}

export const PURCHASE_HISTORY_REPOSITORY = Symbol("PURCHASE_HISTORY_REPOSITORY");
