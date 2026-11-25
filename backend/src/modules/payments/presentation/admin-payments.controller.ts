import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { ManageProviderConfigUseCase } from "../application/manage-provider-config.use-case";
import { RefundPaymentUseCase } from "../application/refund-payment.use-case";

import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { SetProviderConfigDto } from "./dto/set-provider-config.dto";

/** ADM-20 (fournisseurs de paiement) / ADM-26 (remboursements). */
@ApiTags("Admin / Finances")
@Controller("admin/payments")
export class AdminPaymentsController {
  constructor(
    private readonly manageProviderConfigUseCase: ManageProviderConfigUseCase,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
  ) {}

  @Get("providers")
  @RequirePermissions("payments.manage-providers")
  @ApiOperation({ summary: "Lister les fournisseurs de paiement configurés (ADM-20)" })
  async listProviders() {
    const configs = await this.manageProviderConfigUseCase.listAll();
    // Les identifiants/clés chiffrés ne sont jamais renvoyés (section 11, "secrets chiffrés").
    return configs.map((config) => ({
      id: config.id,
      code: config.code,
      label: config.label,
      isActive: config.isActive,
      isTestMode: config.isTestMode,
      priority: config.priority,
      supportedMethods: config.supportedMethods,
    }));
  }

  @Post("providers")
  @RequirePermissions("payments.manage-providers")
  @ApiOperation({ summary: "Configurer un fournisseur de paiement (ADM-20)" })
  async setProviderConfig(@Body() dto: SetProviderConfigDto) {
    const config = await this.manageProviderConfigUseCase.upsert(dto);
    return { id: config.id, code: config.code, isActive: config.isActive };
  }

  @Post("providers/:code/toggle")
  @RequirePermissions("payments.manage-providers")
  @ApiOperation({ summary: "Activer/désactiver un fournisseur (ADM-20)" })
  async toggleProvider(@Param("code") code: string, @Body("isActive") isActive: boolean) {
    await this.manageProviderConfigUseCase.setActive(code, isActive);
    return { code, isActive };
  }

  @Delete("providers/:code")
  @RequirePermissions("payments.manage-providers")
  @ApiOperation({ summary: "Supprimer la configuration d'un fournisseur (refusé s'il a déjà traité des paiements) — ADM-20" })
  async deleteProvider(@Param("code") code: string) {
    await this.manageProviderConfigUseCase.remove(code);
    return { code, deleted: true };
  }

  @Post(":paymentId/refund")
  @RequirePermissions("payments.refund")
  @ApiOperation({ summary: "Traiter une demande de remboursement (ADM-26)" })
  async refund(@Param("paymentId") paymentId: string, @Body() dto: RefundPaymentDto) {
    await this.refundPaymentUseCase.execute(paymentId, dto.amount, dto.reason);
    return { paymentId, refunded: true };
  }
}
