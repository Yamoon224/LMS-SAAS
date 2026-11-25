import { AssessmentsModule } from "@modules/assessments/assessments.module";
import { CourseContentModule } from "@modules/course-content/course-content.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { LanguagesModule } from "@modules/languages/languages.module";
import { LiveSessionsModule } from "@modules/live-sessions/live-sessions.module";
import { MediaModule } from "@modules/media/media.module";
import { PaymentsModule } from "@modules/payments/payments.module";
import { PlansModule } from "@modules/plans/plans.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { UsersModule } from "@modules/users/users.module";
import { WalletsModule } from "@modules/wallets/wallets.module";
import { forwardRef, Module } from "@nestjs/common";

import { ActivatePaidEnrollmentListener } from "./application/activate-paid-enrollment.listener";
import { CanAccessFinalExamUseCase } from "./application/can-access-final-exam.use-case";
import { CheckModuleCompletionUseCase } from "./application/check-module-completion.use-case";
import { CompleteEnrollmentOnExamPassedListener } from "./application/complete-enrollment-on-exam-passed.listener";
import { CompleteNonCertifyingCourseUseCase } from "./application/complete-non-certifying-course.use-case";
import { EnrollInCourseUseCase } from "./application/enroll-in-course.use-case";
import { ExpireOverdueEnrollmentsUseCase } from "./application/expire-overdue-enrollments.use-case";
import { GetAccessibleModulesUseCase } from "./application/get-accessible-modules.use-case";
import { GetEnrollmentProgressUseCase } from "./application/get-enrollment-progress.use-case";
import { GetEnrollmentUseCase } from "./application/get-enrollment.use-case";
import { GetLearnerAssessmentOverviewUseCase } from "./application/get-learner-assessment-overview.use-case";
import { GetLearnerDashboardUseCase } from "./application/get-learner-dashboard.use-case";
import { GetLearnerCourseContentUseCase } from "./application/get-learner-course-content.use-case";
import { GetLearnerLessonUseCase } from "./application/get-learner-lesson.use-case";
import { InitiateEnrollmentPaymentUseCase } from "./application/initiate-enrollment-payment.use-case";
import { LearnerAssessmentGateService } from "./application/learner-assessment-gate.service";
import {
  FindReadableTranslationsUseCase,
  ListLearnerCourseLocalesUseCase,
  ResolveLearnerContentLocaleUseCase,
} from "./application/learner-content-locale.use-cases";
import { ListEnrollmentsUseCase } from "./application/list-enrollments.use-case";
import { ManageEnrollmentUseCase } from "./application/manage-enrollment.use-case";
import { ManualEnrollUseCase } from "./application/manual-enroll.use-case";
import { RecheckCompletionListener } from "./application/recheck-completion.listener";
import { RecordLessonViewUseCase } from "./application/record-lesson-view.use-case";
import { RejectOfflinePaymentUseCase } from "./application/reject-offline-payment.use-case";
import { ResetProgressUseCase } from "./application/reset-progress.use-case";
import { SendInactivityRemindersUseCase } from "./application/send-inactivity-reminders.use-case";
import { ValidateOfflinePaymentUseCase } from "./application/validate-offline-payment.use-case";
import { ENROLLMENT_REPOSITORY } from "./domain/enrollment.repository.port";
import { PROGRESS_REPOSITORY } from "./domain/progress.repository.port";
import { EnrollmentsFacade } from "./enrollments.facade";
import { EnrollmentsScheduler } from "./enrollments.scheduler";
import { EnrollmentPrismaRepository } from "./infrastructure/enrollment.prisma-repository";
import { RemindersProcessor } from "./infrastructure/reminders.processor";
import { ProgressPrismaRepository } from "./infrastructure/progress.prisma-repository";
import { BusinessEnrollmentsController } from "./presentation/business-enrollments.controller";
import { PublicEnrollmentsController } from "./presentation/public-enrollments.controller";
import { PublicLearnerDashboardController } from "./presentation/public-learner-dashboard.controller";

@Module({
  imports: [
    LanguagesModule,
    CoursesModule,
    CourseContentModule,
    AssessmentsModule,
    WalletsModule,
    MediaModule,
    PaymentsModule,
    PlansModule,
    TenantsModule,
    UsersModule,
    forwardRef(() => LiveSessionsModule),
  ],
  controllers: [PublicEnrollmentsController, PublicLearnerDashboardController, BusinessEnrollmentsController],
  providers: [
    GetEnrollmentProgressUseCase,
    EnrollInCourseUseCase,
    ActivatePaidEnrollmentListener,
    ValidateOfflinePaymentUseCase,
    RejectOfflinePaymentUseCase,
    ManualEnrollUseCase,
    RecordLessonViewUseCase,
    CheckModuleCompletionUseCase,
    GetAccessibleModulesUseCase,
    GetLearnerCourseContentUseCase,
    GetLearnerDashboardUseCase,
    GetLearnerLessonUseCase,
    GetLearnerAssessmentOverviewUseCase,
    InitiateEnrollmentPaymentUseCase,
    LearnerAssessmentGateService,
    CanAccessFinalExamUseCase,
    CompleteEnrollmentOnExamPassedListener,
    CompleteNonCertifyingCourseUseCase,
    RecheckCompletionListener,
    ManageEnrollmentUseCase,
    ResetProgressUseCase,
    ListEnrollmentsUseCase,
    FindReadableTranslationsUseCase,
    ResolveLearnerContentLocaleUseCase,
    ListLearnerCourseLocalesUseCase,
    GetEnrollmentUseCase,
    ExpireOverdueEnrollmentsUseCase,
    SendInactivityRemindersUseCase,
    EnrollmentsFacade,
    EnrollmentsScheduler,
    RemindersProcessor,
    { provide: ENROLLMENT_REPOSITORY, useClass: EnrollmentPrismaRepository },
    { provide: PROGRESS_REPOSITORY, useClass: ProgressPrismaRepository },
  ],
  exports: [EnrollmentsFacade],
})
export class EnrollmentsModule {}
