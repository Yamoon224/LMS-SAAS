import { AiTranslationModule } from "@modules/ai-translation/ai-translation.module";
import { AnalyticsModule } from "@modules/analytics/analytics.module";
import { AssessmentsModule } from "@modules/assessments/assessments.module";
import { AuditModule } from "@modules/audit/audit.module";
import { AuthModule } from "@modules/auth/auth.module";
import { CatalogueModule } from "@modules/catalogue/catalogue.module";
import { CertificatesModule } from "@modules/certificates/certificates.module";
import { CourseContentModule } from "@modules/course-content/course-content.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { EnrollmentsModule } from "@modules/enrollments/enrollments.module";
import { IntegrationsModule } from "@modules/integrations/integrations.module";
import { LanguagesModule } from "@modules/languages/languages.module";
import { LegalModule } from "@modules/legal/legal.module";
import { LiveSessionsModule } from "@modules/live-sessions/live-sessions.module";
import { MediaModule } from "@modules/media/media.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { PaymentsModule } from "@modules/payments/payments.module";
import { PlansModule } from "@modules/plans/plans.module";
import { PlatformSettingsModule } from "@modules/platform-settings/platform-settings.module";
import { PrivacyModule } from "@modules/privacy/privacy.module";
import { SubscriptionsModule } from "@modules/subscriptions/subscriptions.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { UsersModule } from "@modules/users/users.module";
import { WalletsModule } from "@modules/wallets/wallets.module";
import { BullModule } from "@nestjs/bullmq";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DomainErrorFilter } from "@shared/filters/domain-error.filter";
import { JwtAuthGuard, PermissionsGuard, QuotaGuard, SubscriptionGuard, TenantGuard } from "@shared/guards";
import { TenantResolutionMiddleware } from "@shared/middleware/tenant-resolution.middleware";
import { LivenessController } from "@shared/health/liveness.controller";
import { SentryExceptionFilter } from "@shared/filters/sentry-exception.filter";
import { QueueModule } from "@shared/queue/queue.module";
import { SharedPortsModule } from "@shared/ports/shared-ports.module";
import { PrismaModule } from "@shared/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" } }),
    PrismaModule,
    SharedPortsModule,
    QueueModule,
    AuditModule,
    LanguagesModule,
    IntegrationsModule,
    LegalModule,
    UsersModule,
    TenantsModule,
    PlansModule,
    PlatformSettingsModule,
    SubscriptionsModule,
    PaymentsModule,
    PrivacyModule,
    WalletsModule,
    CoursesModule,
    CatalogueModule,
    CourseContentModule,
    MediaModule,
    AssessmentsModule,
    EnrollmentsModule,
    LiveSessionsModule,
    CertificatesModule,
    AiTranslationModule,
    NotificationsModule,
    AnalyticsModule,
    AuthModule,
  ],
  controllers: [LivenessController],
  providers: [
    { provide: APP_FILTER, useClass: SentryExceptionFilter },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    // Ordre d'exécution des guards globaux: throttling → auth → tenant → abonnement → quotas → permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_GUARD, useClass: QuotaGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantResolutionMiddleware).forRoutes("*");
  }
}
