/** PUB-18 : une ligne de l'historique d'achats d'un apprenant. */
export interface PurchaseHistoryItem {
  /** Identifiant du paiement (en ligne) ou de l'inscription (hors plateforme). */
  id: string;
  /** ONLINE = payée en ligne via la plateforme ; OFFLINE = paiement hors plateforme validé par l'entreprise. */
  kind: "ONLINE" | "OFFLINE";
  enrollmentId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  /** Moyen de paiement en ligne ; null pour un paiement hors plateforme. */
  method: string | null;
  /** Statut du paiement en ligne ; null pour un paiement hors plateforme. */
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | null;
  /** Statut de la dernière demande de remboursement liée à ce paiement, s'il y en a une. */
  refundStatus: "REQUESTED" | "ACCEPTED" | "REFUNDED" | "REJECTED" | null;
  purchasedAt: Date;
}

/** Achats les plus récents d'abord, tous canaux confondus. */
export function sortPurchasesNewestFirst(items: readonly PurchaseHistoryItem[]): PurchaseHistoryItem[] {
  return [...items].sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());
}
