import { Controller, Get, Param, StreamableFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions, SkipSubscriptionCheck } from "@shared/decorators";

import { GenerateInvoicePdfUseCase } from "../application/generate-invoice-pdf.use-case";
import { ListInvoicesUseCase } from "../application/list-invoices.use-case";

/**
 * ENT-05 : historique des paiements et factures PDF. Accessible sans abonnement valide
 * (@SkipSubscriptionCheck) : une entreprise suspendue doit pouvoir retrouver ses factures.
 */
@ApiTags("Entreprise / Facturation")
@Controller("business/billing")
@SkipSubscriptionCheck()
export class BusinessBillingController {
  constructor(
    private readonly listInvoicesUseCase: ListInvoicesUseCase,
    private readonly generateInvoicePdfUseCase: GenerateInvoicePdfUseCase,
  ) {}

  @Get("invoices")
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Historique des paiements et factures (ENT-05)" })
  async list(@CurrentTenant() tenantId: string) {
    return this.listInvoicesUseCase.execute(tenantId);
  }

  @Get("invoices/:paymentId/pdf")
  @RequirePermissions("subscriptions.manage")
  @ApiOperation({ summary: "Télécharger la facture PDF d'un paiement (ENT-05)" })
  async download(@CurrentTenant() tenantId: string, @Param("paymentId") paymentId: string) {
    const { filename, content } = await this.generateInvoicePdfUseCase.execute(tenantId, paymentId);
    return new StreamableFile(content, {
      type: "application/pdf",
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
