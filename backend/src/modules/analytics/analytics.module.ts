import { NotificationsModule } from "@modules/notifications/notifications.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { Module } from "@nestjs/common";

import { AnalyticsFacade } from "./analytics.facade";
import { GetAdminAlertsUseCase } from "./application/get-admin-alerts.use-case";
import { GetAiConsumptionUseCase } from "./application/get-ai-consumption.use-case";
import { GetBusinessDashboardUseCase } from "./application/get-business-dashboard.use-case";
import { GetCourseReportUseCase } from "./application/get-course-report.use-case";
import { GetPlatformDashboardUseCase } from "./application/get-platform-dashboard.use-case";
import { GetPlatformHealthUseCase } from "./application/get-platform-health.use-case";
import { GetPlatformTrendsUseCase } from "./application/get-platform-trends.use-case";
import { GetTenantOverviewUseCase } from "./application/get-tenant-overview.use-case";
import { ADMIN_ALERTS_REPOSITORY } from "./domain/admin-alerts.repository.port";
import { AI_CONSUMPTION_REPOSITORY } from "./domain/ai-consumption.repository.port";
import { ANALYTICS_REPOSITORY } from "./domain/analytics.repository.port";
import { COURSE_REPORT_REPOSITORY } from "./domain/course-report.repository.port";
import { PLATFORM_HEALTH_REPOSITORY } from "./domain/platform-health.repository.port";
import { SUPERVISION_REPOSITORY } from "./domain/supervision.repository.port";
import { TENANT_OVERVIEW_REPOSITORY } from "./domain/tenant-overview.repository.port";
import { AdminAlertsPrismaRepository } from "./infrastructure/admin-alerts.prisma-repository";
import { AiConsumptionPrismaRepository } from "./infrastructure/ai-consumption.prisma-repository";
import { AnalyticsPrismaRepository } from "./infrastructure/analytics.prisma-repository";
import { CourseReportPrismaRepository } from "./infrastructure/course-report.prisma-repository";
import { PlatformHealthPrismaRepository } from "./infrastructure/platform-health.prisma-repository";
import { SupervisionPrismaRepository } from "./infrastructure/supervision.prisma-repository";
import { TenantOverviewPrismaRepository } from "./infrastructure/tenant-overview.prisma-repository";
import { AdminAiConsumptionController } from "./presentation/admin-ai-consumption.controller";
import { AdminAlertsController } from "./presentation/admin-alerts.controller";
import { AdminAnalyticsController } from "./presentation/admin-analytics.controller";
import { AdminHealthController } from "./presentation/admin-health.controller";
import { AdminSupervisionController } from "./presentation/admin-supervision.controller";
import { AdminTenantOverviewController } from "./presentation/admin-tenant-overview.controller";
import { BusinessAnalyticsController } from "./presentation/business-analytics.controller";

@Module({
  imports: [NotificationsModule, TenantsModule],
  controllers: [
    AdminAnalyticsController,
    AdminAlertsController,
    AdminTenantOverviewController,
    AdminHealthController,
    AdminSupervisionController,
    AdminAiConsumptionController,
    BusinessAnalyticsController,
  ],
  providers: [
    GetBusinessDashboardUseCase,
    GetPlatformDashboardUseCase,
    GetPlatformTrendsUseCase,
    GetCourseReportUseCase,
    GetAiConsumptionUseCase,
    GetPlatformHealthUseCase,
    GetAdminAlertsUseCase,
    GetTenantOverviewUseCase,
    AnalyticsFacade,
    { provide: COURSE_REPORT_REPOSITORY, useClass: CourseReportPrismaRepository },
    { provide: PLATFORM_HEALTH_REPOSITORY, useClass: PlatformHealthPrismaRepository },
    { provide: AI_CONSUMPTION_REPOSITORY, useClass: AiConsumptionPrismaRepository },
    { provide: SUPERVISION_REPOSITORY, useClass: SupervisionPrismaRepository },
    { provide: ADMIN_ALERTS_REPOSITORY, useClass: AdminAlertsPrismaRepository },
    { provide: TENANT_OVERVIEW_REPOSITORY, useClass: TenantOverviewPrismaRepository },
    { provide: ANALYTICS_REPOSITORY, useClass: AnalyticsPrismaRepository },
  ],
  exports: [AnalyticsFacade],
})
export class AnalyticsModule {}
