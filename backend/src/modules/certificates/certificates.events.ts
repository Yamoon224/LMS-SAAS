/**
 * Événements de domaine publics du module certificates. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */

/** ENT-41: consommé par le module notifications pour informer l'apprenant. */
export class CertificateIssuedEvent {
  constructor(
    public readonly certificateId: string,
    public readonly learnerUserId: string,
    public readonly courseTitle: string,
  ) {}
}

/** ENT-44: attestation de suivi délivrée — consommé par notifications (apprenant) et audit. */
export class AttestationIssuedEvent {
  constructor(
    public readonly attestationId: string,
    public readonly learnerUserId: string,
    public readonly courseTitle: string,
    public readonly tenantId: string,
  ) {}
}

/** ENT-44: attestation révoquée par un gestionnaire (audit, motif obligatoire). */
export class AttestationRevokedEvent {
  constructor(
    public readonly attestationId: string,
    public readonly tenantId: string,
    public readonly actorId: string | null,
    public readonly reason: string,
  ) {}
}
