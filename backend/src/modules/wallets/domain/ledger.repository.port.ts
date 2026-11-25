import type { LedgerEntryDraft } from "./sale-ledger-entries";
import type { BreakdownLedgerRow } from "./sales-breakdown";
import type { TenantBalance } from "./tenant-balance";

export interface RecordLedgerEntriesInput {
  tenantId: string;
  currency: string;
  sourceId: string;
  /** Fin de la période de rétention (ADM-23) ; non pertinent pour les comptes autres que TENANT. */
  availableAt: Date;
  entries: readonly LedgerEntryDraft[];
}

/** BE-06: le grand livre est immuable — aucune méthode de mise à jour ou de suppression n'est exposée. */
export interface LedgerRepositoryPort {
  record(input: RecordLedgerEntriesInput): Promise<void>;
  getTenantBalance(tenantId: string, now?: Date): Promise<TenantBalance>;
  /** ADM-27: rapprochement quotidien entre fournisseurs et grand livre. */
  getProviderNetPosition(providerAccount: "PROVIDER", since: Date, until: Date): Promise<number>;
  /** RG-25: net initialement crédité à l'entreprise pour une vente, pour calculer le prorata d'un remboursement. */
  getTenantNetForSale(sourceId: string): Promise<number | null>;
  /**
   * Étape 30 : écritures (vente, commission, frais, remboursements) dont la disponibilité tombe dans
   * ]from, to] — `from` null = depuis l'origine — pour le relevé détaillé brut/commission/frais/net.
   */
  listBreakdownRows(tenantId: string, from: Date | null, to: Date): Promise<BreakdownLedgerRow[]>;
}

export const LEDGER_REPOSITORY = Symbol("LEDGER_REPOSITORY");
