import { PaymentsFacade } from "@modules/payments/payments.facade";
import { PlansFacade } from "@modules/plans/plans.facade";
import { Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

/**
 * Dupliqué depuis payments/domain/payment-method.ts plutôt qu'importé — un
 * module ne doit jamais dépendre des fichiers internes (domain/...) d'un
 * autre module (section 13.2).
 */
type PaymentMethod = "CARD" | "ORANGE_MONEY" | "MTN_MOMO" | "MOOV_MONEY" | "WAVE" | "OTHER";

export interface PurchaseCreditPackInput {
  tenantId: string;
  creditPackId: string;
  method: PaymentMethod;
  customerEmail?: string;
  callbackUrl?: string;
}

/**
 * ADM-18: achat d'un pack de crédits IA par l'entreprise. Le crédit du
 * portefeuille n'a lieu qu'à la confirmation serveur du paiement (RG-06, par
 * analogie) — voir CreditWalletOnPaymentSucceededListener.
 */
@Injectable()
export class PurchaseCreditPackUseCase {
  constructor(
    private readonly plansFacade: PlansFacade,
    private readonly paymentsFacade: PaymentsFacade,
  ) {}

  async execute(input: PurchaseCreditPackInput) {
    const pack = await this.plansFacade.findCreditPack(input.creditPackId);
    if (!pack) {
      throw new NotFoundDomainError(`Pack de crédits introuvable: ${input.creditPackId}`);
    }

    return this.paymentsFacade.initiatePayment({
      tenantId: input.tenantId,
      type: "CREDIT_PURCHASE",
      method: input.method,
      amount: pack.price,
      currency: pack.currency,
      objectId: pack.id,
      creditPackId: pack.id,
      customerEmail: input.customerEmail,
      callbackUrl: input.callbackUrl,
    });
  }
}
