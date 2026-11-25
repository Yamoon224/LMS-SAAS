import { Inject, Injectable } from "@nestjs/common";

import type { Invoice } from "../domain/invoice";
import { PAYMENT_REPOSITORY } from "../domain/payment.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";

/** ENT-05 : historique des paiements encaissés de l'entreprise. */
@Injectable()
export class ListInvoicesUseCase {
  constructor(@Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort) {}

  async execute(tenantId: string): Promise<Invoice[]> {
    return this.paymentRepository.listInvoices(tenantId);
  }
}
