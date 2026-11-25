import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { GetLearnerDashboardUseCase } from "../application/get-learner-dashboard.use-case";

/** PUB-05 : tableau de bord agrégé de l'apprenant (en cours, terminées, prochaines sessions live). */
@ApiTags("Plateforme publique / Tableau de bord")
@Controller("public/enrollments/dashboard")
export class PublicLearnerDashboardController {
  constructor(private readonly getLearnerDashboardUseCase: GetLearnerDashboardUseCase) {}

  @Get()
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Tableau de bord apprenant : formations en cours, terminées, prochaines sessions live (PUB-05)" })
  async dashboard(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tenantId: string) {
    return this.getLearnerDashboardUseCase.execute(user.userId, tenantId);
  }
}
