import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { DecideRefundRequestUseCase, ListRefundRequestsUseCase } from "../application/refund-requests.use-cases";

import { AcceptRefundDto, DecideRefundDto } from "./dto/refund-requests.dto";
import { toRefundResponse } from "./refund-response";

/** ENT-70 : examen des demandes de remboursement des apprenants. */
@ApiTags("Entreprise / Remboursements")
@Controller("business/refunds")
export class BusinessRefundsController {
  constructor(
    private readonly listRefundRequestsUseCase: ListRefundRequestsUseCase,
    private readonly decideRefundRequestUseCase: DecideRefundRequestUseCase,
  ) {}

  @Get()
  @RequirePermissions("refunds.manage")
  @ApiOperation({ summary: "Demandes de remboursement de l'entreprise (ENT-70)" })
  async list(@CurrentTenant() tenantId: string) {
    return (await this.listRefundRequestsUseCase.forTenant(tenantId)).map(toRefundResponse);
  }

  @Post(":refundId/accept")
  @RequirePermissions("refunds.manage")
  @ApiOperation({ summary: "Accepter une demande ; l'Admin exécute ensuite le remboursement (ENT-70)" })
  async accept(
    @CurrentTenant() tenantId: string,
    @Param("refundId") refundId: string,
    @Body() dto: AcceptRefundDto,
  ) {
    const status = await this.decideRefundRequestUseCase.execute({
      tenantId,
      refundId,
      decision: "ACCEPT",
      amount: dto.amount,
    });
    return { id: refundId, status };
  }

  @Post(":refundId/reject")
  @RequirePermissions("refunds.manage")
  @ApiOperation({ summary: "Refuser une demande avec un motif obligatoire (ENT-70)" })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param("refundId") refundId: string,
    @Body() dto: DecideRefundDto,
  ) {
    const status = await this.decideRefundRequestUseCase.execute({
      tenantId,
      refundId,
      decision: "REJECT",
      note: dto.note,
    });
    return { id: refundId, status };
  }
}
