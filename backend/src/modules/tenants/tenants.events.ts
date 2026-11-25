/**
 * Événements de domaine publics du module tenants. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */
export class TenantCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly slug: string,
  ) {}
}

export class TenantArchivedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly actorId: string | null,
  ) {}
}

export class TenantSuspendedEvent {
  constructor(public readonly tenantId: string) {}
}

/**
 * Des paramètres de l'entreprise ont été modifiés (identité, contacts, hors plateforme, reversement, vérification
 * du compte de reversement). Ne porte JAMAIS de valeur : seulement les noms des champs touchés, pour que le journal
 * d'audit ne puisse pas fuiter un numéro de compte ou une coordonnée.
 */
export class TenantSettingsChangedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly changedFields: readonly string[],
  ) {}
}
