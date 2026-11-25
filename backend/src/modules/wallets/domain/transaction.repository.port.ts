import type { Transaction } from "./transaction";

/** Lecture seule : historique des ventes d'une entreprise (ENT-68). */
export interface TransactionRepositoryPort {
  listForTenant(tenantId: string): Promise<Transaction[]>;
}

export const TRANSACTION_REPOSITORY = Symbol("TRANSACTION_REPOSITORY");
