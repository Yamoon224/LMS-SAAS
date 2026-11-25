import { Body, Controller, Get, Param, Post, StreamableFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { GeneratePayoutStatementUseCase } from "../application/generate-payout-statement.use-case";
import { GetSalesBreakdownUseCase } from "../application/get-sales-breakdown.use-case";
import { GetTenantBalanceUseCase } from "../application/get-tenant-balance.use-case";
import { ListPayoutsUseCase } from "../application/list-payouts.use-case";
import { ListTransactionsUseCase } from "../application/list-transactions.use-case";
import { RequestPayoutUseCase } from "../application/request-payout.use-case";

import { RequestPayoutDto } from "./dto/request-payout.dto";

/** ENT-69: solde en attente et disponible, demande de reversement, historique. */
@ApiTags("Entreprise / Ventes et statistiques")
@Controller("business/wallet")
export class BusinessWalletController {
  constructor(
    private readonly getTenantBalanceUseCase: GetTenantBalanceUseCase,
    private readonly getSalesBreakdownUseCase: GetSalesBreakdownUseCase,
    private readonly requestPayoutUseCase: RequestPayoutUseCase,
    private readonly listPayoutsUseCase: ListPayoutsUseCase,
    private readonly listTransactionsUseCase: ListTransactionsUseCase,
    private readonly generatePayoutStatementUseCase: GeneratePayoutStatementUseCase,
  ) {}

  @Get("balance")
  @RequirePermissions("wallet.view")
  @ApiOperation({ summary: "Solde en attente et disponible (ENT-69)" })
  async getBalance(@CurrentTenant() tenantId: string) {
    return this.getTenantBalanceUseCase.execute(tenantId);
  }

  @Get("breakdown")
  @RequirePermissions("wallet.view")
  @ApiOperation({ summary: "Ventilation cumulée brut / commission / frais / net des ventes (ENT-69)" })
  async getBreakdown(@CurrentTenant() tenantId: string) {
    return this.getSalesBreakdownUseCase.execute(tenantId);
  }

  @Get("transactions")
  @RequirePermissions("wallet.view")
  @ApiOperation({ summary: "Historique des ventes: brut, commission, frais, net (ENT-68)" })
  async listTransactions(@CurrentTenant() tenantId: string) {
    return this.listTransactionsUseCase.execute(tenantId);
  }

  @Get("payouts")
  @RequirePermissions("wallet.view")
  @ApiOperation({ summary: "Historique des reversements de l'entreprise (ENT-69)" })
  async listPayouts(@CurrentTenant() tenantId: string) {
    const payouts = await this.listPayoutsUseCase.listForTenant(tenantId);
    return payouts.map((payout) => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      destinationType: payout.destination.type,
      accountName: payout.destination.accountName,
      /** Numéro de compte masqué: seuls les 4 derniers caractères sont exposés. */
      accountNumberMasked: `••••${payout.destination.accountNumber.slice(-4)}`,
      rejectionReason: payout.toSnapshot().rejectionReason,
      requestedAt: payout.requestedAt,
    }));
  }

  @Get("payouts/:payoutId/statement")
  @RequirePermissions("wallet.view")
  @ApiOperation({ summary: "Relevé PDF d'un reversement exécuté (ENT-69)" })
  async downloadStatement(@CurrentTenant() tenantId: string, @Param("payoutId") payoutId: string) {
    const { filename, content } = await this.generatePayoutStatementUseCase.execute(tenantId, payoutId);
    return new StreamableFile(content, {
      type: "application/pdf",
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post("payouts")
  @RequirePermissions("wallet.request-payout")
  @ApiOperation({ summary: "Demander un reversement du solde disponible (ENT-69)" })
  async requestPayout(@CurrentTenant() tenantId: string, @Body() _dto: RequestPayoutDto) {
    // La destination est le compte enregistré ET vérifié de l'entreprise (ENT-11) : le corps n'est plus utilisé.
    const payout = await this.requestPayoutUseCase.execute(tenantId);
    return { id: payout.id, amount: payout.amount, status: payout.status };
  }
}
