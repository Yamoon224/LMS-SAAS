/**
 * Événements de domaine publics du module live-sessions. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */

/** ENT-57 : pointage manuel d'une présence par l'entreprise — consommé par l'audit. */
export class LiveAttendanceMarkedEvent {
  constructor(
    public readonly liveSessionId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly learnerUserId: string,
    public readonly present: boolean,
  ) {}
}

/** ENT-53: consommé par le module notifications pour informer les inscrits. */
export class LiveSessionScheduledEvent {
  constructor(
    public readonly liveSessionId: string,
    public readonly courseId: string,
    public readonly title: string,
    public readonly startAt: Date,
    public readonly meetLink: string,
  ) {}
}
