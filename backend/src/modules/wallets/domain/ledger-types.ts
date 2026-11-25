/**
 * Convention du grand livre (BE-06): chaque compte représente une dette ou
 * créance nette, jamais une trésorerie physique.
 *   PLATFORM  CREDIT = la plateforme a reçu/doit davantage (obligation ou créance qui augmente)
 *             DEBIT  = l'inverse (elle paie, ou sa créance diminue)
 *   TENANT    CREDIT = la plateforme doit davantage à l'entreprise (solde qui augmente)
 *             DEBIT  = la plateforme doit moins à l'entreprise (solde qui diminue)
 *   PROVIDER  DEBIT  = le fournisseur de paiement doit à la plateforme (créance à l'encaissement)
 *             CREDIT = cette créance diminue (remboursement renvoyé par le fournisseur)
 *   EXTERNAL  DEBIT  = sortie de trésorerie réelle vers l'entreprise (reversement exécuté)
 * Toute fonction de ce module doit produire un jeu d'écritures dont la somme
 * des débits égale la somme des crédits (voir assertBalanced).
 */
export type LedgerAccount = "PLATFORM" | "TENANT" | "PROVIDER" | "EXTERNAL";
export type LedgerDirection = "DEBIT" | "CREDIT";
export type LedgerSourceType = "SALE" | "COMMISSION" | "FEE" | "REFUND" | "PAYOUT" | "OFFLINE_COMMISSION";

export interface LedgerEntryRecord {
  id: string;
  tenantId: string;
  account: LedgerAccount;
  direction: LedgerDirection;
  amount: number;
  currency: string;
  sourceType: LedgerSourceType;
  sourceId: string;
  availableAt: Date;
  createdAt: Date;
}
