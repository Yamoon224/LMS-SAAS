import { SubscriptionsModule } from "@modules/subscriptions/subscriptions.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { Module } from "@nestjs/common";


import { GenerateInvoicePdfUseCase } from "./application/generate-invoice-pdf.use-case";
import { HandlePaymentFailedForSubscriptionListener } from "./application/handle-payment-failed-for-subscription.listener";
import { HandlePaymentSucceededForSubscriptionListener } from "./application/handle-payment-succeeded-for-subscription.listener";
import { InitiatePaymentUseCase } from "./application/initiate-payment.use-case";
import { ListAvailableMethodsUseCase } from "./application/list-available-methods.use-case";
import { ListInvoicesUseCase } from "./application/list-invoices.use-case";
import { ManageProviderConfigUseCase } from "./application/manage-provider-config.use-case";
import { RenewDueSubscriptionsUseCase } from "./application/renew-subscriptions.use-case";
import { RequestProrataPaymentListener } from "./application/request-prorata-payment.listener";
import { ProcessWebhookUseCase } from "./application/process-webhook.use-case";
import {
  GetReconciliationOverviewUseCase,
  PollPendingPaymentsUseCase,
  RefundDuplicatePaymentUseCase,
  ReplayWebhookUseCase,
} from "./application/reconciliation.use-cases";
import { RefundPaymentUseCase } from "./application/refund-payment.use-case";
import {
  DecideRefundRequestUseCase,
  ExecuteRefundRequestUseCase,
  ListRefundRequestsUseCase,
  RequestRefundUseCase,
} from "./application/refund-requests.use-cases";
import { INVOICE_PDF_RENDERER } from "./domain/invoice-pdf-renderer.port";
import { PAYMENT_GATEWAY_REGISTRY } from "./domain/payment-gateway-registry.port";
import { PAYMENT_PROVIDER_CONFIG_REPOSITORY } from "./domain/payment-provider-config.repository.port";
import { PAYMENT_REPOSITORY } from "./domain/payment.repository.port";
import { PURCHASE_HISTORY_REPOSITORY } from "./domain/purchase-history.repository.port";
import { RECONCILIATION_REPOSITORY } from "./domain/reconciliation.repository.port";
import { REFUND_ELIGIBILITY_DATA } from "./domain/refund-eligibility";
import { REFUND_REQUEST_REPOSITORY } from "./domain/refund-request.repository.port";
import { WEBHOOK_EVENT_LOG } from "./domain/webhook-event-log.port";
import { PaymentGatewayRegistry } from "./infrastructure/payment-gateway-registry";
import { PaymentProviderConfigPrismaRepository } from "./infrastructure/payment-provider-config.prisma-repository";
import { PaymentPrismaRepository } from "./infrastructure/payment.prisma-repository";
import { PdfKitInvoiceRendererAdapter } from "./infrastructure/pdfkit-invoice-renderer.adapter";
import { PurchaseHistoryPrismaRepository } from "./infrastructure/purchase-history.prisma-repository";
import { ReconciliationPrismaRepository } from "./infrastructure/reconciliation.prisma-repository";
import { RefundEligibilityDataAdapter } from "./infrastructure/refund-eligibility-data.adapter";
import { RefundRequestPrismaRepository } from "./infrastructure/refund-request.prisma-repository";
import { WebhookEventLogPrismaRepository } from "./infrastructure/webhook-event-log.prisma-repository";
import { PaymentsFacade } from "./payments.facade";
import { PaymentsScheduler } from "./payments.scheduler";
import { AdminPaymentsController } from "./presentation/admin-payments.controller";
import { AdminReconciliationController } from "./presentation/admin-reconciliation.controller";
import { AdminRefundsController } from "./presentation/admin-refunds.controller";
import { BusinessBillingController } from "./presentation/business-billing.controller";
import { BusinessRefundsController } from "./presentation/business-refunds.controller";
import { PaymentWebhooksController } from "./presentation/payment-webhooks.controller";
import { PublicPaymentsController } from "./presentation/public-payments.controller";
import { PublicRefundsController } from "./presentation/public-refunds.controller";

@Module({
  imports: [SubscriptionsModule, TenantsModule],
  controllers: [
    AdminPaymentsController,
    BusinessBillingController,
    AdminRefundsController,
    AdminReconciliationController,
    BusinessRefundsController,
    PublicRefundsController, PaymentWebhooksController, PublicPaymentsController],
  providers: [
    InitiatePaymentUseCase,
    ListAvailableMethodsUseCase,
    ProcessWebhookUseCase,
    PollPendingPaymentsUseCase,
    ReplayWebhookUseCase,
    GetReconciliationOverviewUseCase,
    RefundDuplicatePaymentUseCase,
    PaymentsScheduler,
    ListInvoicesUseCase,
    GenerateInvoicePdfUseCase,
    RefundPaymentUseCase,
    RequestRefundUseCase,
    DecideRefundRequestUseCase,
    ListRefundRequestsUseCase,
    ExecuteRefundRequestUseCase,
    ManageProviderConfigUseCase,
    HandlePaymentSucceededForSubscriptionListener,
    HandlePaymentFailedForSubscriptionListener,
    RenewDueSubscriptionsUseCase,
    RequestProrataPaymentListener,
    PaymentsFacade,
    { provide: INVOICE_PDF_RENDERER, useClass: PdfKitInvoiceRendererAdapter },
    { provide: PURCHASE_HISTORY_REPOSITORY, useClass: PurchaseHistoryPrismaRepository },
    { provide: RECONCILIATION_REPOSITORY, useClass: ReconciliationPrismaRepository },
    { provide: REFUND_ELIGIBILITY_DATA, useClass: RefundEligibilityDataAdapter },
    { provide: REFUND_REQUEST_REPOSITORY, useClass: RefundRequestPrismaRepository },
    { provide: WEBHOOK_EVENT_LOG, useClass: WebhookEventLogPrismaRepository },
    { provide: PAYMENT_REPOSITORY, useClass: PaymentPrismaRepository },
    { provide: PAYMENT_PROVIDER_CONFIG_REPOSITORY, useClass: PaymentProviderConfigPrismaRepository },
    { provide: PAYMENT_GATEWAY_REGISTRY, useClass: PaymentGatewayRegistry },
  ],
  exports: [PaymentsFacade],
})
export class PaymentsModule {}
