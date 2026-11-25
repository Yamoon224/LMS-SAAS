import { Module } from "@nestjs/common";

import { ActivateSubscriptionUseCase } from "./application/activate-subscription.use-case";
import {
  ApplySubscriptionDiscountUseCase,
  ExtendSubscriptionPeriodUseCase,
  OfferPlanUseCase,
} from "./application/admin-subscription.use-cases";
import { ChangePlanUseCase } from "./application/change-plan.use-case";
import { CheckTenantOperationalUseCase } from "./application/check-tenant-operational.use-case";
import { GetSubscriptionUsageUseCase } from "./application/get-subscription-usage.use-case";
import { GetTenantSubscriptionUseCase } from "./application/get-tenant-subscription.use-case";
import { ListRenewalsDueUseCase } from "./application/list-renewals-due.use-case";
import { CancelPendingPlanChangeUseCase, PreviewPlanChangeUseCase, SetAutoRenewUseCase } from "./application/plan-change.use-cases";
import { ProcessGracePeriodExpiryUseCase } from "./application/process-grace-period-expiry.use-case";
import {
  AttachRenewalPaymentUseCase,
  BeginRenewalUseCase,
  ConfirmSubscriptionPaymentUseCase,
  EndNonRenewingSubscriptionsUseCase,
  FailRenewalUseCase,
  ListRenewalCandidatesUseCase,
} from "./application/renewal.use-cases";
import { SubscribeToPlanUseCase } from "./application/subscribe-to-plan.use-case";
import { SUBSCRIPTION_REPOSITORY } from "./domain/subscription.repository.port";
import { SubscriptionPrismaRepository } from "./infrastructure/subscription.prisma-repository";
import { AdminSubscriptionsController } from "./presentation/admin-subscriptions.controller";
import { BusinessSubscriptionsController } from "./presentation/business-subscriptions.controller";
import { SubscriptionsFacade } from "./subscriptions.facade";
import { SubscriptionsScheduler } from "./subscriptions.scheduler";

@Module({
  controllers: [AdminSubscriptionsController, BusinessSubscriptionsController],
  providers: [
    CheckTenantOperationalUseCase,
    SubscribeToPlanUseCase,
    ExtendSubscriptionPeriodUseCase,
    ApplySubscriptionDiscountUseCase,
    OfferPlanUseCase,
    ActivateSubscriptionUseCase,
    ChangePlanUseCase,
    PreviewPlanChangeUseCase,
    CancelPendingPlanChangeUseCase,
    SetAutoRenewUseCase,
    ListRenewalCandidatesUseCase,
    BeginRenewalUseCase,
    AttachRenewalPaymentUseCase,
    ConfirmSubscriptionPaymentUseCase,
    FailRenewalUseCase,
    EndNonRenewingSubscriptionsUseCase,
    ProcessGracePeriodExpiryUseCase,
    ListRenewalsDueUseCase,
    GetSubscriptionUsageUseCase,
    GetTenantSubscriptionUseCase,
    SubscriptionsFacade,
    SubscriptionsScheduler,
    { provide: SUBSCRIPTION_REPOSITORY, useClass: SubscriptionPrismaRepository },
  ],
  exports: [SubscriptionsFacade],
})
export class SubscriptionsModule {}
