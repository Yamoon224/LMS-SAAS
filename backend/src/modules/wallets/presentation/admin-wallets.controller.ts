import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { GetTenantBalanceUseCase } from "../application/get-tenant-balance.use-case";
import { ListPayoutsUseCase } from "../application/list-payouts.use-case";
import { ProcessPayoutUseCase } from "../application/process-payout.use-case";

import { ExecutePayoutDto } from "./dto/execute-payout.dto";
import { RejectPayoutDto } from "./dto/reject-payout.dto";

/** ADM-22 à ADM-24: soldes des entreprises, file des reversements avec double validation. */
@ApiTags("Admin / Finances")
@Controller("admin/wallets")
export class AdminWalletsController {
  constructor(
    private readonly getTenantBalanceUseCase: GetTenantBalanceUseCase,
    private readonly processPayoutUseCase: ProcessPayoutUseCase,
    private readonly listPayoutsUseCase: ListPayoutsUseCase,
  ) {}

  @Get("tenants/:tenantId/balance")
  @RequirePermissions("wallet.view-all")
  @ApiOperation({ summary: "Solde d'une entreprise (ADM-22)" })
  async getTenantBalance(@Param("tenantId") tenantId: string) {
    return this.getTenantBalanceUseCase.execute(tenantId);
  }

  @Post("payouts/:id/validate")
  @RequirePermissions("payouts.validate")
  @ApiOperation({ summary: "Première validation d'un reversement, par un opérateur (ADM-24)" })
  async validate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.processPayoutUseCase.validate(id, user.userId);
    return { id, status: "VALIDATED" };
  }

  @Post("payouts/:id/approve")
  @RequirePermissions("payouts.approve")
  @ApiOperation({ summary: "Seconde validation, par la finance (ADM-24)" })
  async approve(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.processPayoutUseCase.approve(id, user.userId);
    return { id, status: "APPROVED" };
  }

  @Post("payouts/:id/execute")
  @RequirePermissions("payouts.execute")
  @ApiOperation({ summary: "Exécution avec preuve jointe (ADM-24)" })
  async execute(@Param("id") id: string, @Body() dto: ExecutePayoutDto) {
    await this.processPayoutUseCase.execute(id, dto.proofUrl);
    return { id, status: "EXECUTED" };
  }

  @Post("payouts/:id/reject")
  @RequirePermissions("payouts.approve")
  @ApiOperation({ summary: "Rejeter un reversement (ADM-24)" })
  async reject(@Param("id") id: string, @Body() dto: RejectPayoutDto) {
    await this.processPayoutUseCase.reject(id, dto.reason);
    return { id, status: "REJECTED" };
  }

  @Get("payouts")
  @RequirePermissions("payouts.validate")
  @ApiOperation({ summary: "File des reversements par statut (ADM-24)" })
  async listByStatus(@Query("status") status: string) {
    const payouts = await this.listPayoutsUseCase.execute(status);
    return payouts.map((payout) => ({ id: payout.id, tenantId: payout.tenantId, amount: payout.amount, status: payout.status }));
  }
}
