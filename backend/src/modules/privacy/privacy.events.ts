/**
 * Événements de domaine publics du module privacy (journal d'audit). Ils ne portent aucune donnée personnelle :
 * seulement l'identifiant interne, sans valeur hors de la base.
 */
export class LearnerDataExportedEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string | null,
    public readonly counts: Record<string, number>,
  ) {}
}

export class LearnerAccountDeletedEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string | null,
    /** SELF: demandée par l'apprenant ; RETENTION: anonymisation automatique d'un compte inactif. */
    public readonly origin: "SELF" | "RETENTION",
  ) {}
}

export class ExpiredPersonalDataPurgedEvent {
  constructor(
    public readonly notificationsDeleted: number,
    public readonly accountsAnonymized: number,
  ) {}
}
