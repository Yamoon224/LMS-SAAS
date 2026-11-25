import type { RawAdminAlerts } from "./admin-alerts";

/** Lecture seule des comptages d'alertes plateforme (ADM-03). */
export interface AdminAlertsRepositoryPort {
  getRawAlerts(now: Date): Promise<RawAdminAlerts>;
}

export const ADMIN_ALERTS_REPOSITORY = Symbol("ADMIN_ALERTS_REPOSITORY");
