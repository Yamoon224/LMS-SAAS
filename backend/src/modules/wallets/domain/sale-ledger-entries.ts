import { DomainError } from "@shared/errors/domain-error";

import type { LedgerAccount, LedgerDirection, LedgerSourceType } from "./ledger-types";

export class InvalidSaleAmountError extends DomainError {
  readonly code = "MONTANT_VENTE_INVALIDE";
}

export interface LedgerEntryDraft {
  account: LedgerAccount;
  direction: LedgerDirection;
  amount: number;
  sourceType: LedgerSourceType;
}

export interface SaleLedgerInput {
  grossAmount: number;
  commissionAmount: number;
  providerFee: number;
  /** true si l'entreprise supporte les frais fournisseur (ADM-21), sinon la plateforme. */
  feeChargedToTenant: boolean;
}

/**
 * RG-22/BE-06: "toute vente en ligne est encaissée par la plateforme. Le net
 * (prix − commission − frais à la charge de l'entreprise) est crédité au
 * solde en attente". Produit les écritures en partie double correspondantes
 * — fonction pure du domaine, aucune dépendance technique (section 13.1).
 *
 * Partie double sur 3 comptes (PROVIDER / PLATFORM / TENANT) :
 *   PROVIDER  DEBIT  grossAmount   — le fournisseur de paiement doit la somme encaissée à la plateforme
 *   PLATFORM  CREDIT grossAmount   — contrepartie : la plateforme reçoit la créance
 *   PLATFORM  DEBIT  netToTenant   — la plateforme doit le net à l'entreprise
 *   TENANT    CREDIT netToTenant   — contrepartie : solde de l'entreprise (en attente)
 *   (commission et frais restent acquis à la plateforme : ils sont la
 *   différence entre les deux montants ci-dessus. Depuis l'étape 30 ils sont
 *   en plus isolés par des écritures de ventilation équilibrées, voir
 *   buildSaleBreakdownEntries.)
 *
 * Exemple du cahier des charges (section 9.3): 50 000 FCFA, frais 2,5% à la
 * charge de l'entreprise (1 250), commission 10% (5 000) → net 43 750.
 * Somme des débits = somme des crédits = 50 000 + 43 750 = 93 750.
 */
export function buildSaleLedgerEntries(input: SaleLedgerInput): LedgerEntryDraft[] {
  if (input.grossAmount <= 0) {
    throw new InvalidSaleAmountError(`Le montant brut d'une vente doit être positif: ${input.grossAmount}`);
  }
  if (input.commissionAmount < 0 || input.commissionAmount > input.grossAmount) {
    throw new InvalidSaleAmountError(
      `La commission (${input.commissionAmount}) doit être comprise entre 0 et le montant brut (${input.grossAmount}).`,
    );
  }

  const feeDeductedFromTenant = input.feeChargedToTenant ? input.providerFee : 0;
  const netToTenant = input.grossAmount - input.commissionAmount - feeDeductedFromTenant;

  if (netToTenant < 0) {
    throw new InvalidSaleAmountError(
      "Le net dû à l'entreprise ne peut pas être négatif (commission + frais dépassent le montant brut).",
    );
  }

  if (input.providerFee < 0) {
    throw new InvalidSaleAmountError(`Le frais du fournisseur ne peut pas être négatif: ${input.providerFee}`);
  }

  return [
    { account: "PROVIDER", direction: "DEBIT", amount: input.grossAmount, sourceType: "SALE" },
    { account: "PLATFORM", direction: "CREDIT", amount: input.grossAmount, sourceType: "SALE" },
    { account: "PLATFORM", direction: "DEBIT", amount: netToTenant, sourceType: "SALE" },
    { account: "TENANT", direction: "CREDIT", amount: netToTenant, sourceType: "SALE" },
    ...buildSaleBreakdownEntries(input.commissionAmount, input.providerFee),
  ];
}

/**
 * Étape 30 — écritures de ventilation, SANS effet sur le net crédité à l'entreprise ni sur son solde (qui ne lit que
 * le compte TENANT). Chaque couple est équilibré en lui-même :
 *  - COMMISSION : PLATFORM CREDIT (produit de commission, lu par les statistiques de la plateforme) contre
 *    PLATFORM DEBIT de contrepartie ; la commission reste acquise à la plateforme, le couple s'annule sur le compte.
 *  - FEE : PROVIDER CREDIT (le fournisseur retient son frais sur ce qu'il reverse à la plateforme) contre
 *    PLATFORM DEBIT (charge de la plateforme, répercutée ou non sur l'entreprise via le net).
 * Une valeur nulle ne produit aucune écriture. Les ventes enregistrées avant cette étape n'ont pas ces écritures :
 * les lecteurs doivent tolérer leur absence.
 */
export function buildSaleBreakdownEntries(commissionAmount: number, providerFee: number): LedgerEntryDraft[] {
  const entries: LedgerEntryDraft[] = [];
  if (commissionAmount > 0) {
    entries.push(
      { account: "PLATFORM", direction: "CREDIT", amount: commissionAmount, sourceType: "COMMISSION" },
      { account: "PLATFORM", direction: "DEBIT", amount: commissionAmount, sourceType: "COMMISSION" },
    );
  }
  if (providerFee > 0) {
    entries.push(
      { account: "PROVIDER", direction: "CREDIT", amount: providerFee, sourceType: "FEE" },
      { account: "PLATFORM", direction: "DEBIT", amount: providerFee, sourceType: "FEE" },
    );
  }
  return entries;
}

/** Somme des débits et des crédits d'un jeu d'écritures — doit toujours être égale (équilibre comptable). */
export function assertBalanced(entries: readonly LedgerEntryDraft[]): void {
  const totalDebit = entries.filter((e) => e.direction === "DEBIT").reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = entries.filter((e) => e.direction === "CREDIT").reduce((sum, e) => sum + e.amount, 0);

  if (totalDebit !== totalCredit) {
    throw new InvalidSaleAmountError(
      `Écritures déséquilibrées: débit ${totalDebit} ≠ crédit ${totalCredit}.`,
    );
  }
}
