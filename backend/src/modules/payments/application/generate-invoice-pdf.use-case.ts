import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { INVOICE_PDF_RENDERER } from "../domain/invoice-pdf-renderer.port";
import type { InvoicePdfRendererPort } from "../domain/invoice-pdf-renderer.port";
import { PAYMENT_REPOSITORY } from "../domain/payment.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";

export interface InvoicePdf {
  filename: string;
  content: Buffer;
}

/** ENT-05 : facture PDF d'un paiement. Le paiement doit appartenir à l'entreprise appelante. */
@Injectable()
export class GenerateInvoicePdfUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort,
    @Inject(INVOICE_PDF_RENDERER) private readonly renderer: InvoicePdfRendererPort,
    private readonly tenantsFacade: TenantsFacade,
  ) {}

  async execute(tenantId: string, paymentId: string): Promise<InvoicePdf> {
    const invoice = await this.paymentRepository.findInvoice(tenantId, paymentId);
    if (!invoice) throw new NotFoundDomainError(`Facture introuvable: ${paymentId}`);

    const tenant = await this.tenantsFacade.findById(tenantId);
    const content = await this.renderer.render({
      invoice,
      customerName: tenant?.name ?? "Client",
      customerEmail: null,
    });
    return { filename: `${invoice.number}.pdf`, content };
  }
}
