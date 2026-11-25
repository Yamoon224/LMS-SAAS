/** Événements publics du module integrations (consommés par le journal d'audit, RG-19). */

/**
 * Une intégration a été modifiée ou réinitialisée. Ne porte JAMAIS de valeur : seulement les noms des champs
 * touchés, pour que le journal d'audit ne puisse pas fuiter un secret.
 */
export class IntegrationChangedEvent {
  constructor(
    public readonly provider: string,
    public readonly actorId: string,
    public readonly kind: "UPDATED" | "RESET",
    public readonly changedFields: readonly string[],
  ) {}
}
