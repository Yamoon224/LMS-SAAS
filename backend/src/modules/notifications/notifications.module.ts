import { CertificatesModule } from "@modules/certificates/certificates.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { EnrollmentsModule } from "@modules/enrollments/enrollments.module";
import { IntegrationsModule } from "@modules/integrations/integrations.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { UsersModule } from "@modules/users/users.module";
import { WalletsModule } from "@modules/wallets/wallets.module";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { AttestationIssuedListener } from "./application/attestation-issued.listener";
import { CertificateIssuedListener } from "./application/certificate-issued.listener";
import { EnqueueNotificationUseCase } from "./application/enqueue-notification.use-case";
import { EnrollmentActivatedListener } from "./application/enrollment-activated.listener";
import { EnrollmentInactivityListener } from "./application/enrollment-inactivity.listener";
import { EnrollmentRefusedListener } from "./application/enrollment-refused.listener";
import { ListNotificationsUseCase } from "./application/list-notifications.use-case";
import { LiveSessionScheduledListener } from "./application/live-session-scheduled.listener";
import {
  ListNotificationTemplatesUseCase,
  ResetNotificationTemplateUseCase,
  SaveNotificationTemplateUseCase,
} from "./application/manage-notification-templates.use-cases";
import { MarkNotificationReadUseCase } from "./application/mark-notification-read.use-case";
import { NotifyUserUseCase } from "./application/notify-user.use-case";
import { PasswordResetRequestedListener } from "./application/password-reset-requested.listener";
import { PaymentFailedListener } from "./application/payment-failed.listener";
import { PayoutExecutedListener } from "./application/payout-executed.listener";
import { RefundRequestDecidedListener } from "./application/refund-request-decided.listener";
import { RefundRequestedListener } from "./application/refund-requested.listener";
import { SendNotificationUseCase } from "./application/send-notification.use-case";
import { SubscriptionLifecycleListener } from "./application/subscription-lifecycle.listener";
import { UserInvitedListener } from "./application/user-invited.listener";
import { EMAIL_SENDER } from "./domain/email-sender.port";
import { NOTIFICATION_QUEUE } from "./domain/notification-queue.port";
import { NOTIFICATION_REPOSITORY } from "./domain/notification.repository.port";
import { SMS_SENDER } from "./domain/sms-sender.port";
import { TEMPLATE_OVERRIDE_REPOSITORY } from "./domain/template-override.repository.port";
import {
  BullMqNotificationQueueAdapter,
  NOTIFICATIONS_QUEUE_NAME,
} from "./infrastructure/bullmq-notification-queue.adapter";
import { HttpSmsSenderAdapter } from "./infrastructure/http-sms-sender.adapter";
import { NodemailerEmailSenderAdapter } from "./infrastructure/nodemailer-email-sender.adapter";
import { NotificationPrismaRepository } from "./infrastructure/notification.prisma-repository";
import { NotificationProcessor } from "./infrastructure/notification.processor";
import { TemplateOverridePrismaRepository } from "./infrastructure/template-override.prisma-repository";
import { NotificationsFacade } from "./notifications.facade";
import { AdminNotificationTemplatesController } from "./presentation/admin-notification-templates.controller";
import { NotificationsController } from "./presentation/notifications.controller";

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE_NAME }),
    UsersModule,
    TenantsModule,
    CoursesModule,
    EnrollmentsModule,
    IntegrationsModule,
    CertificatesModule,
    WalletsModule,
  ],
  controllers: [NotificationsController, AdminNotificationTemplatesController],
  providers: [
    EnqueueNotificationUseCase,
    SendNotificationUseCase,
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
    NotifyUserUseCase,
    UserInvitedListener,
    PaymentFailedListener,
    PasswordResetRequestedListener,
    ListNotificationTemplatesUseCase,
    SaveNotificationTemplateUseCase,
    ResetNotificationTemplateUseCase,
    { provide: TEMPLATE_OVERRIDE_REPOSITORY, useClass: TemplateOverridePrismaRepository },
    RefundRequestDecidedListener,
    RefundRequestedListener,
    SubscriptionLifecycleListener,
    PayoutExecutedListener,
    AttestationIssuedListener,
    CertificateIssuedListener,
    EnrollmentActivatedListener,
    EnrollmentInactivityListener,
    EnrollmentRefusedListener,
    LiveSessionScheduledListener,
    NotificationProcessor,
    NotificationsFacade,
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationPrismaRepository },
    { provide: NOTIFICATION_QUEUE, useClass: BullMqNotificationQueueAdapter },
    { provide: EMAIL_SENDER, useClass: NodemailerEmailSenderAdapter },
    { provide: SMS_SENDER, useClass: HttpSmsSenderAdapter },
  ],
  exports: [NotificationsFacade],
})
export class NotificationsModule {}
