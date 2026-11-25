import type { LedgerEntryDraft } from "./sale-ledger-entries";

export interface RefundLedgerInput {
  /** Montant remboursé à l'apprenant. */
  refundAmount: number;
  /**
   * Part du net initialement crédité à l'entreprise pour cette vente, au
   * prorata du remboursement si partiel (RG-25: "annule la commission de la
   * vente et débite le solde de l'entreprise").
   */
  tenantNetToReverse: number;
}

/**
 * RG-25: "un remboursement annule la commission de la vente et débite le
 * solde de l'entreprise ; si le montant a déjà été reversé, le solde devient
 * négatif et est compensé sur les reversements suivants." Le solde négatif
 * n'est pas empêché ici — il est le résultat naturel de ces écritures ;
 * PayoutsFacade en tient compte au moment de calculer le disponible (RG-23).
 *
 * Deux mouvements indépendants, chacun équilibré (voir ledger-types.ts) :
 *  - le fournisseur restitue l'argent à l'apprenant (créance PROVIDER/PLATFORM qui diminue) ;
 *  - la plateforme annule ce qu'elle devait à l'entreprise pour cette vente (solde TENANT qui diminue).
 */
/**
 * Part du net de l'entreprise à reprendre pour un remboursement partiel : proportionnelle au montant remboursé
 * (RG-25), arrondie à l'unité. Un remboursement intégral reprend exactement le net, sans écart d'arrondi.
 */
export function prorateTenantNet(originalTenantNet: number, refundAmount: number, paymentAmount: number): number {
  if (paymentAmount <= 0 || refundAmount >= paymentAmount) return originalTenantNet;
  return Math.round((originalTenantNet * refundAmount) / paymentAmount);
}

export function buildRefundLedgerEntries(input: RefundLedgerInput): LedgerEntryDraft[] {
  return [
    { account: "PROVIDER", direction: "CREDIT", amount: input.refundAmount, sourceType: "REFUND" },
    { account: "PLATFORM", direction: "DEBIT", amount: input.refundAmount, sourceType: "REFUND" },
    { account: "TENANT", direction: "DEBIT", amount: input.tenantNetToReverse, sourceType: "REFUND" },
    { account: "PLATFORM", direction: "CREDIT", amount: input.tenantNetToReverse, sourceType: "REFUND" },
  ];
}

export interface OfflineCommissionLedgerInput {
  /** RG-24: montant de la commission due sur une vente hors plateforme. */
  commissionAmount: number;
}

/**
 * RG-24: "une vente hors plateforme génère, si la règle l'exige, une
 * commission due par l'entreprise, déduite du prochain reversement ou
 * facturée." Débite le solde de l'entreprise ; aucun mouvement PROVIDER
 * (aucun flux n'a transité par la plateforme — section 9.1).
 */
export function buildOfflineCommissionLedgerEntries(
  input: OfflineCommissionLedgerInput,
): LedgerEntryDraft[] {
  return [
    { account: "TENANT", direction: "DEBIT", amount: input.commissionAmount, sourceType: "OFFLINE_COMMISSION" },
    { account: "PLATFORM", direction: "CREDIT", amount: input.commissionAmount, sourceType: "OFFLINE_COMMISSION" },
  ];
}

export interface PayoutLedgerInput {
  amount: number;
}

/**
 * ADM-24/section 8.1: exécution d'un reversement. La plateforme ne fait que
 * transmettre un solde déjà comptabilisé comme dû au tenant — elle ne
 * s'enrichit ni ne s'appauvrit, donc PLATFORM n'intervient pas ici : la
 * dette envers l'entreprise s'éteint (TENANT DEBIT) exactement au moment où
 * la trésorerie sort vers son compte externe (EXTERNAL CREDIT).
 */
export function buildPayoutLedgerEntries(input: PayoutLedgerInput): LedgerEntryDraft[] {
  return [
    { account: "TENANT", direction: "DEBIT", amount: input.amount, sourceType: "PAYOUT" },
    { account: "EXTERNAL", direction: "CREDIT", amount: input.amount, sourceType: "PAYOUT" },
  ];
}
