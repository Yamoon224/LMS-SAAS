import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { ListAvailableMethodsUseCase } from "../application/list-available-methods.use-case";
import { PURCHASE_HISTORY_REPOSITORY } from "../domain/purchase-history.repository.port";
import type { PurchaseHistoryRepositoryPort } from "../domain/purchase-history.repository.port";

/** PUB-07: moyens de paiement en ligne actuellement proposés à l'apprenant. */
@ApiTags("Plateforme publique / Paiements")
@Controller("public/payments")
export class PublicPaymentsController {
  constructor(
    private readonly listAvailableMethodsUseCase: ListAvailableMethodsUseCase,
    @Inject(PURCHASE_HISTORY_REPOSITORY) private readonly purchaseHistoryRepository: PurchaseHistoryRepositoryPort,
  ) {}

  @Get("history")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Mon historique d'achats : paiements en ligne et hors plateforme (PUB-18)" })
  async history(@CurrentUser() user: AuthenticatedUser) {
    return this.purchaseHistoryRepository.listForLearner(user.userId);
  }

  @Get("methods")
  @RequirePermissions("learner.enroll")
  @ApiOperation({ summary: "Moyens de paiement disponibles (fournisseurs actifs)" })
  async methods() {
    return { methods: await this.listAvailableMethodsUseCase.execute() };
  }
}
