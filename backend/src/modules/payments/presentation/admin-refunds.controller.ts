import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { ExecuteRefundRequestUseCase, ListRefundRequestsUseCase } from "../application/refund-requests.use-cases";

import { ListRefundsQueryDto } from "./dto/refund-requests.dto";
import { toRefundResponse } from "./refund-response";

/** Suivi Admin des demandes et exécution des remboursements acceptés (ADM-26). */
@ApiTags("Admin / Finances")
@Controller("admin/refunds")
export class AdminRefundsController {
  constructor(
    private readonly listRefundRequestsUseCase: ListRefundRequestsUseCase,
    private readonly executeRefundRequestUseCase: ExecuteRefundRequestUseCase,
  ) {}

  @Get()
  @RequirePermissions("payments.refund")
  @ApiOperation({ summary: "Demandes de remboursement par statut (défaut : acceptées, à exécuter)" })
  async list(@Query() query: ListRefundsQueryDto) {
    return (await this.listRefundRequestsUseCase.byStatus(query.status ?? "ACCEPTED")).map((request) => ({ ...toRefundResponse(request), tenantId: request.tenantId }));
  }

  @Post(":refundId/execute")
  @RequirePermissions("payments.refund")
  @ApiOperation({ summary: "Exécuter le remboursement d'une demande acceptée" })
  async execute(@Param("refundId") refundId: string) {
    await this.executeRefundRequestUseCase.execute(refundId);
    return { id: refundId, status: "REFUNDED" };
  }
}
