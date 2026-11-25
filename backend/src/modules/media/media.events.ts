/**
 * Événements de domaine publics du module media. Contrairement aux fichiers
 * de domain/application/infrastructure/presentation, ce fichier est une
 * sortie publique au même titre que la façade — les autres modules peuvent
 * s'y abonner (@OnEvent) sans violer les frontières de couches (section
 * 13.2, "communication entre modules... par événements de domaine").
 */
export class MediaAssetReadyEvent {
  constructor(
    public readonly mediaAssetId: string,
    public readonly tenantId: string,
  ) {}
}

/** Étape 28 : un fichier téléversé a été refusé par l'analyse antivirus (journal d'audit). `reason` est un code stable. */
export class MediaAssetRejectedEvent {
  constructor(
    public readonly mediaAssetId: string,
    public readonly tenantId: string,
    public readonly reason: "MALWARE_DETECTED" | "SCAN_SIZE_LIMIT",
  ) {}
}

export class MediaTranscodingStartedEvent {
  constructor(
    public readonly mediaAssetId: string,
    public readonly providerJobId: string,
  ) {}
}

export class MediaTranscodingCompletedEvent {
  constructor(
    public readonly mediaAssetId: string,
    public readonly tenantId: string,
  ) {}
}

export class MediaTranscodingFailedEvent {
  constructor(
    public readonly mediaAssetId: string,
    public readonly reason: string,
  ) {}
}
