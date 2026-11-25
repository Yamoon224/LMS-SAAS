import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  GetReconciliationOverviewUseCase,
  RefundDuplicatePaymentUseCase,
  ReplayWebhookUseCase,
} from "../application/reconciliation.use-cases";

/** ADM-27 : rapprochement des paiements — paiements en attente, webhooks en échec (rejeu), doublons suspects. */
@ApiTags("Admin / Finances")
@Controller("admin/reconciliation")
export class AdminReconciliationController {
  constructor(
    private readonly getOverviewUseCase: GetReconciliationOverviewUseCase,
    private readonly replayWebhookUseCase: ReplayWebhookUseCase,
    private readonly refundDuplicateUseCase: RefundDuplicatePaymentUseCase,
  ) {}

  @Get()
  @RequirePermissions("payments.reconcile")
  @ApiOperation({ summary: "Paiements en attente anciens, webhooks en échec, doublons suspects" })
  overview() {
    return this.getOverviewUseCase.execute();
  }

  @Post("webhooks/:webhookEventId/replay")
  @HttpCode(200)
  @RequirePermissions("payments.reconcile")
  @ApiOperation({ summary: "Rejouer le traitement d'un webhook en échec (idempotent, audité)" })
  replay(@Param("webhookEventId") webhookEventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.replayWebhookUseCase.execute(webhookEventId, user.userId);
  }

  @Post("duplicates/:paymentId/refund")
  @HttpCode(200)
  @RequirePermissions("payments.refund")
  @ApiOperation({ summary: "Rembourser intégralement un paiement signalé comme doublon" })
  async refundDuplicate(@Param("paymentId") paymentId: string) {
    await this.refundDuplicateUseCase.execute(paymentId);
    return { paymentId, status: "REFUNDED" };
  }
}
