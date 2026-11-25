import { CourseContentModule } from "@modules/course-content/course-content.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { IntegrationsModule } from "@modules/integrations/integrations.module";
import { LanguagesModule } from "@modules/languages/languages.module";
import { PaymentsModule } from "@modules/payments/payments.module";
import { PlansModule } from "@modules/plans/plans.module";
import { Module } from "@nestjs/common";

import { AiTranslationFacade } from "./ai-translation.facade";
import { ConfirmTranslationUseCase } from "./application/confirm-translation.use-case";
import {
  ListCourseTranslationsUseCase,
  SetCourseTranslationPublicationUseCase,
} from "./application/course-translations.use-cases";
import { CreditWalletOnPaymentSucceededListener } from "./application/credit-wallet-on-payment-succeeded.listener";
import { EstimateTranslationUseCase } from "./application/estimate-translation.use-case";
import { GetWalletBalanceUseCase } from "./application/get-wallet-balance.use-case";
import { GrantPlanCreditsOnSubscriptionActivatedListener } from "./application/grant-plan-credits-on-subscription-activated.listener";
import { ListLedgerUseCase } from "./application/list-ledger.use-case";
import { ListTranslationJobsUseCase } from "./application/list-translation-jobs.use-case";
import { PurchaseCreditPackUseCase } from "./application/purchase-credit-pack.use-case";
import { RunTranslationUseCase } from "./application/run-translation.use-case";
import { CREDIT_WALLET_REPOSITORY } from "./domain/credit-wallet.repository.port";
import { TRANSLATION_JOB_REPOSITORY } from "./domain/translation-job.repository.port";
import { TRANSLATION_PROVIDER } from "./domain/translation-provider.port";
import { CreditWalletPrismaRepository } from "./infrastructure/credit-wallet.prisma-repository";
import { HttpTranslationProviderAdapter } from "./infrastructure/http-translation-provider.adapter";
import { TranslationJobPrismaRepository } from "./infrastructure/translation-job.prisma-repository";
import { BusinessAiTranslationController } from "./presentation/business-ai-translation.controller";

@Module({
  imports: [CoursesModule, CourseContentModule, PlansModule, PaymentsModule, LanguagesModule, IntegrationsModule],
  controllers: [BusinessAiTranslationController],
  providers: [
    EstimateTranslationUseCase,
    ListCourseTranslationsUseCase,
    SetCourseTranslationPublicationUseCase,
    ConfirmTranslationUseCase,
    RunTranslationUseCase,
    PurchaseCreditPackUseCase,
    CreditWalletOnPaymentSucceededListener,
    GrantPlanCreditsOnSubscriptionActivatedListener,
    GetWalletBalanceUseCase,
    ListLedgerUseCase,
    ListTranslationJobsUseCase,
    AiTranslationFacade,
    { provide: CREDIT_WALLET_REPOSITORY, useClass: CreditWalletPrismaRepository },
    { provide: TRANSLATION_JOB_REPOSITORY, useClass: TranslationJobPrismaRepository },
    { provide: TRANSLATION_PROVIDER, useClass: HttpTranslationProviderAdapter },
  ],
  exports: [AiTranslationFacade],
})
export class AiTranslationModule {}
