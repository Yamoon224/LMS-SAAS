import type { PaymentMethod, PaymentStatus, PaymentType } from "./payment-method";

/** Vue « facture » d'un paiement encaissé pour une entreprise (ENT-05). */
export interface Invoice {
  paymentId: string;
  /** Numéro lisible, dérivé de la date et de l'identifiant du paiement (stable, sans compteur). */
  number: string;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  description: string;
  amount: number;
  currency: string;
  issuedAt: Date;
}

/** Statuts pour lesquels une facture existe : le paiement a bien été encaissé. */
export const INVOICEABLE_STATUSES: readonly PaymentStatus[] = ["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"];

/** Types facturés à l'entreprise (les ventes de formations sont facturées aux apprenants, pas à l'entreprise). */
export const INVOICEABLE_TYPES: readonly PaymentType[] = ["SUBSCRIPTION", "CREDIT_PURCHASE"];

export function buildInvoiceNumber(paymentId: string, issuedAt: Date): string {
  const year = issuedAt.getUTCFullYear();
  const month = String(issuedAt.getUTCMonth() + 1).padStart(2, "0");
  return `FAC-${year}${month}-${paymentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
