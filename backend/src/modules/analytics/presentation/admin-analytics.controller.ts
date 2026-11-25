import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { GetPlatformDashboardUseCase } from "../application/get-platform-dashboard.use-case";
import { GetPlatformTrendsUseCase } from "../application/get-platform-trends.use-case";

import { DateRangeDto } from "./dto/date-range.dto";

/** ADM: tableau de bord plateforme (tenants, MRR, churn, apprenants, formations, commission). */
@ApiTags("Admin / Tableau de bord")
@Controller("admin/analytics")
export class AdminAnalyticsController {
  constructor(
    private readonly getPlatformDashboardUseCase: GetPlatformDashboardUseCase,
    private readonly getPlatformTrendsUseCase: GetPlatformTrendsUseCase,
  ) {}

  @Get("trends")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Évolution dans le temps (séries) et répartitions par statut, tous tenants" })
  async trends(@Query() query: DateRangeDto) {
    const to = query.to ? new Date(query.to) : new Date();
    // Défaut : les 6 derniers mois, mois courant compris.
    const from = query.from ? new Date(query.from) : new Date(to.getFullYear(), to.getMonth() - 5, 1);
    return this.getPlatformTrendsUseCase.execute({ from, to });
  }

  @Get("dashboard")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Tableau de bord plateforme (tous tenants) sur une période" })
  async dashboard(@Query() query: DateRangeDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : this.startOfCurrentMonth();
    return this.getPlatformDashboardUseCase.execute({ from, to });
  }

  private startOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
