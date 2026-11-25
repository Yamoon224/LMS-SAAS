import { useMutation } from "@tanstack/react-query";

import { refundPayment } from "../api/payments.api";
import type { RefundPaymentValues } from "../schemas/payment-provider.schema";

/**
 * ADM-26: traite un remboursement. Aucune liste de transactions n'est
 * exposée par le backend aujourd'hui (PaymentRepositoryPort ne propose que
 * findById/findByProviderReference) — l'identifiant du paiement à rembourser
 * doit donc être saisi directement (voir le rapport de livraison).
 */
export function useRefundPayment() {
  return useMutation({
    meta: { successMessage: "Remboursement traité." },
    mutationFn: ({ paymentId, values }: { paymentId: string; values: RefundPaymentValues }) =>
      refundPayment(paymentId, values),
  });
}
