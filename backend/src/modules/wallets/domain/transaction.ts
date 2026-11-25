/** ENT-68 : une ligne de l'historique des ventes d'une entreprise. */
export interface Transaction {
  id: string;
  /** ONLINE = encaissée par la plateforme ; OFFLINE = paiement hors plateforme validé par un gestionnaire. */
  channel: "ONLINE" | "OFFLINE";
  /** Statut du paiement en ligne (SUCCEEDED, REFUNDED...) ; null pour un paiement hors plateforme. */
  status: string | null;
  courseTitle: string;
  /** Référence fournisseur (en ligne) ou référence saisie par le gestionnaire (hors plateforme). */
  reference: string;
  currency: string;
  gross: number;
  commission: number | null;
  fee: number;
  /** Montant revenant à l'entreprise ; null tant que la vente n'est pas inscrite au grand livre. */
  net: number | null;
  occurredAt: Date;
}

/**
 * Ventilation d'une vente en ligne à partir du grand livre (BE-06).
 * Le grand livre ne pose que le net dû à l'entreprise (voir buildSaleLedgerEntries) ; la commission est donc
 * la différence brut − net − frais, les frais étant à la charge de l'entreprise (ADM-21, valeur par défaut).
 */
export function breakDownOnlineSale(
  gross: number,
  providerFee: number,
  netCredited: number | null,
  /** Étape 30 : commission isolée au grand livre (écritures COMMISSION) ; null/absente pour les ventes antérieures. */
  ledgerCommission: number | null = null,
): { commission: number | null; fee: number; net: number | null } {
  if (netCredited === null) return { commission: null, fee: providerFee, net: null };
  // Commission lue telle quelle quand elle est isolée : exacte même si la plateforme supporte les frais (sinon la
  // différence brut − net − frais la sous-estimerait).
  if (ledgerCommission !== null) return { commission: ledgerCommission, fee: providerFee, net: netCredited };
  return { commission: Math.max(gross - netCredited - providerFee, 0), fee: providerFee, net: netCredited };
}

/** Paiement hors plateforme : aucun flux n'a transité par la plateforme, seule la commission éventuelle est due. */
export function breakDownOfflineSale(gross: number, commissionDue: number): { commission: number; net: number } {
  return { commission: commissionDue, net: gross - commissionDue };
}
