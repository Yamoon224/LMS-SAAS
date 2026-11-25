import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { ListRefundRequestsUseCase, RequestRefundUseCase } from "../application/refund-requests.use-cases";

import { RequestRefundDto } from "./dto/refund-requests.dto";

/** Section 9.5 : demande de remboursement d'une formation achetée en ligne. */
@ApiTags("Plateforme publique / Remboursements")
@Controller("public/refunds")
export class PublicRefundsController {
  constructor(
    private readonly requestRefundUseCase: RequestRefundUseCase,
    private readonly listRefundRequestsUseCase: ListRefundRequestsUseCase,
  ) {}

  @Get("my")
  @RequirePermissions("learner.request-refund")
  @ApiOperation({ summary: "Suivre mes demandes de remboursement (statut et motif de refus)" })
  async my(@CurrentUser() user: AuthenticatedUser) {
    const requests = await this.listRefundRequestsUseCase.forLearner(user.userId);
    // Liste blanche : ni identifiant de paiement ou d'entreprise, ni indicateur interne réservé à l'entreprise.
    return requests.map((request) => ({
      id: request.id,
      enrollmentId: request.enrollmentId,
      courseTitle: request.courseTitle,
      amount: request.amount,
      currency: request.currency,
      status: request.status,
      reason: request.reason,
      decisionNote: request.decisionNote,
      requestedAt: request.requestedAt,
      resolvedAt: request.resolvedAt,
    }));
  }

  @Post()
  @RequirePermissions("learner.request-refund")
  @ApiOperation({ summary: "Demander le remboursement d'une formation achetée en ligne" })
  async request(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestRefundDto) {
    const request = await this.requestRefundUseCase.execute({
      userId: user.userId,
      enrollmentId: dto.enrollmentId,
      reason: dto.reason,
    });
    return { id: request.id, status: request.status };
  }
}
