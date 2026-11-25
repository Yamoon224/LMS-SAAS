import { Injectable } from "@nestjs/common";

import { InitiatePaymentUseCase } from "./application/initiate-payment.use-case";
import type { InitiatePaymentInput, InitiatePaymentResult } from "./application/initiate-payment.use-case";
import { ListAvailableMethodsUseCase } from "./application/list-available-methods.use-case";

/**
 * Seule API publique du module payments. Les modules métier (subscriptions
 * pour ENT-02, le futur module enrollments pour l'achat d'une formation)
 * initient leurs paiements via cette façade plutôt que d'accéder directement
 * au registre de passerelles.
 */
@Injectable()
export class PaymentsFacade {
  constructor(
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly listAvailableMethodsUseCase: ListAvailableMethodsUseCase,
  ) {}

  /** Moyens de paiement proposés par au moins un fournisseur actif (codes `PaymentMethod`). */
  async listAvailableMethods(): Promise<string[]> {
    return this.listAvailableMethodsUseCase.execute();
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return this.initiatePaymentUseCase.execute(input);
  }
}
