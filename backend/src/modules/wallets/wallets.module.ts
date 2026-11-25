
import { PaymentsModule } from "@modules/payments/payments.module";
import { PlansModule } from "@modules/plans/plans.module";
import { PlatformSettingsModule } from "@modules/platform-settings/platform-settings.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { Module } from "@nestjs/common";

import { GeneratePayoutStatementUseCase } from "./application/generate-payout-statement.use-case";
import { GetPayoutUseCase } from "./application/get-payout.use-case";
import { GetSalesBreakdownUseCase } from "./application/get-sales-breakdown.use-case";
import { GetTenantBalanceUseCase } from "./application/get-tenant-balance.use-case";
import { ListPayoutsUseCase } from "./application/list-payouts.use-case";
import { ListTransactionsUseCase } from "./application/list-transactions.use-case";
import { ProcessPayoutUseCase } from "./application/process-payout.use-case";
import { RecordOfflineSaleCommissionUseCase } from "./application/record-offline-sale-commission.use-case";
import { RecordRefundToLedgerListener } from "./application/record-refund-to-ledger.listener";
import { RecordSaleToLedgerListener } from "./application/record-sale-to-ledger.listener";
import { RequestPayoutUseCase } from "./application/request-payout.use-case";
import { RunAutomaticPayoutsUseCase } from "./application/run-automatic-payouts.use-case";
import { LEDGER_REPOSITORY } from "./domain/ledger.repository.port";
import { PAYOUT_STATEMENT_RENDERER } from "./domain/payout-statement-renderer.port";
import { PAYOUT_REPOSITORY } from "./domain/payout.repository.port";
import { TRANSACTION_REPOSITORY } from "./domain/transaction.repository.port";
import { LedgerPrismaRepository } from "./infrastructure/ledger.prisma-repository";
import { PayoutPrismaRepository } from "./infrastructure/payout.prisma-repository";
import { PdfKitPayoutStatementRendererAdapter } from "./infrastructure/pdfkit-payout-statement-renderer.adapter";
import { TransactionPrismaRepository } from "./infrastructure/transaction.prisma-repository";
import { AdminWalletsController } from "./presentation/admin-wallets.controller";
import { BusinessWalletController } from "./presentation/business-wallet.controller";
import { WalletsFacade } from "./wallets.facade";
import { WalletsScheduler } from "./wallets.scheduler";

@Module({
  imports: [PaymentsModule, PlansModule, PlatformSettingsModule, TenantsModule],
  controllers: [AdminWalletsController, BusinessWalletController],
  providers: [
    GetTenantBalanceUseCase,
    GetSalesBreakdownUseCase,
    GetPayoutUseCase,
    RequestPayoutUseCase,
    RunAutomaticPayoutsUseCase,
    WalletsScheduler,
    ProcessPayoutUseCase,
    ListPayoutsUseCase,
    ListTransactionsUseCase,
    GeneratePayoutStatementUseCase,
    RecordOfflineSaleCommissionUseCase,
    RecordSaleToLedgerListener,
    RecordRefundToLedgerListener,
    WalletsFacade,
    { provide: LEDGER_REPOSITORY, useClass: LedgerPrismaRepository },
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionPrismaRepository },
    { provide: PAYOUT_STATEMENT_RENDERER, useClass: PdfKitPayoutStatementRendererAdapter },
    { provide: PAYOUT_REPOSITORY, useClass: PayoutPrismaRepository },
  ],
  exports: [WalletsFacade],
})
export class WalletsModule {}
