import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { GetAdminAlertsUseCase } from "../application/get-admin-alerts.use-case";

/** ADM-03 : alertes de la plateforme. */
@ApiTags("Admin / Alertes")
@Controller("admin/alerts")
export class AdminAlertsController {
  constructor(private readonly getAdminAlertsUseCase: GetAdminAlertsUseCase) {}

  @Get()
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Alertes actives typées (sévérité, compteur, lien d'action) — ADM-03" })
  alerts() {
    return this.getAdminAlertsUseCase.execute();
  }
}
