/**
 * Événements de domaine publics du module plans (sortie publique au même titre que la façade) : consommés par le
 * journal d'audit (ADM-13). Aucune valeur de quota n'est portée : seulement les noms des champs touchés.
 */
export class PlanUpdatedEvent {
  constructor(
    public readonly planId: string,
    public readonly actorId: string,
    public readonly changedFields: readonly string[],
  ) {}
}

/** `archived` vaut false pour un désarchivage. */
export class PlanArchivedEvent {
  constructor(
    public readonly planId: string,
    public readonly actorId: string,
    public readonly archived: boolean,
  ) {}
}
