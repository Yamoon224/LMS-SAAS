import { Injectable } from "@nestjs/common";

import { GetBusinessDashboardUseCase } from "./application/get-business-dashboard.use-case";
import type { DateRange } from "./domain/analytics.repository.port";
import type { BusinessDashboard } from "./domain/business-dashboard";

/**
 * Seule API publique du module analytics. Aucun autre module n'en a besoin
 * à ce jour (les tableaux de bord sont consommés directement par les
 * back-office Admin/Entreprise via les contrôleurs) ; elle existe par
 * cohérence architecturale (section 13.2).
 */
@Injectable()
export class AnalyticsFacade {
  constructor(private readonly getBusinessDashboardUseCase: GetBusinessDashboardUseCase) {}

  async getBusinessDashboard(tenantId: string, range: DateRange): Promise<BusinessDashboard> {
    return this.getBusinessDashboardUseCase.execute(tenantId, range);
  }
}
