import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { GetBusinessDashboardUseCase } from "../application/get-business-dashboard.use-case";
import { GetCourseReportUseCase } from "../application/get-course-report.use-case";

import { DateRangeDto } from "./dto/date-range.dto";

/** ENT: tableau de bord de l'entreprise (apprenants actifs, revenu, complétion, certificats, formations phares). */
@ApiTags("Entreprise / Tableau de bord")
@Controller("business/analytics")
export class BusinessAnalyticsController {
  constructor(
    private readonly getBusinessDashboardUseCase: GetBusinessDashboardUseCase,
    private readonly getCourseReportUseCase: GetCourseReportUseCase,
  ) {}

  @Get("dashboard")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Tableau de bord de l'entreprise sur une période" })
  async dashboard(@CurrentTenant() tenantId: string, @Query() query: DateRangeDto) {
    const { from, to } = this.resolveRange(query);
    return this.getBusinessDashboardUseCase.execute(tenantId, { from, to });
  }

  @Get("courses/:courseId/report")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Rapport par formation : entonnoir, modules bloquants, questions échouées (ENT-67)" })
  async courseReport(@CurrentTenant() tenantId: string, @Param("courseId") courseId: string) {
    return this.getCourseReportUseCase.execute(tenantId, courseId);
  }

  private resolveRange(query: DateRangeDto): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : this.startOfCurrentMonth();
    return { from, to };
  }

  private startOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
