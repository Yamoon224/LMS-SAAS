import { Inject, Injectable } from "@nestjs/common";

import { buildAdminAlerts } from "../domain/admin-alerts";
import type { AdminAlertsReport } from "../domain/admin-alerts";
import { ADMIN_ALERTS_REPOSITORY } from "../domain/admin-alerts.repository.port";
import type { AdminAlertsRepositoryPort } from "../domain/admin-alerts.repository.port";

/** ADM-03 : alertes agrégées de la plateforme (paiements, abonnements, reversements, webhooks, IA, médias...). */
@Injectable()
export class GetAdminAlertsUseCase {
  constructor(@Inject(ADMIN_ALERTS_REPOSITORY) private readonly repository: AdminAlertsRepositoryPort) {}

  async execute(now: Date = new Date()): Promise<AdminAlertsReport> {
    const raw = await this.repository.getRawAlerts(now);
    const alerts = buildAdminAlerts(raw, now);
    return {
      generatedAt: now,
      criticalCount: alerts.filter((alert) => alert.severity === "CRITICAL").length,
      alerts,
    };
  }
}
