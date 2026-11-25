/**
 * Événements de domaine publics du module wallets. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */
export class PayoutRequestedEvent {
  constructor(
    public readonly payoutId: string,
    public readonly tenantId: string,
    /** Étape 30 : vrai si la demande a été générée par la tâche planifiée (auteur « système »). */
    public readonly automatic: boolean = false,
  ) {}
}

export class PayoutExecutedEvent {
  constructor(
    public readonly payoutId: string,
    public readonly tenantId: string,
  ) {}
}
