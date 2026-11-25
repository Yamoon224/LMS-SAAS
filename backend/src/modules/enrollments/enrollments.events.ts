/**
 * Événements de domaine publics du module enrollments. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */

/**
 * RG-13: "pour une formation certifiante, le certificat est délivré
 * automatiquement si l'examen est réussi et toutes les conditions remplies."
 * RG-21: une formation non certifiante se termine sans certificat — le
 * module certificates filtre lui-même selon le type de formation (ENT-38)
 * avant de délivrer quoi que ce soit.
 */
export class EnrollmentCompletedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly courseId: string,
  ) {}
}

/**
 * ENT-55: "les apprenants qui s'inscrivent après la planification d'une
 * session live y sont automatiquement ajoutés comme invités." Émis chaque
 * fois qu'une inscription obtient l'accès au contenu (paiement en ligne
 * confirmé, validation hors plateforme, ou formation gratuite).
 */
/** PUB-18 : une inscription ACTIVE n'a pas progressé depuis 7 jours (au plus un événement par 14 jours et par inscription). */
export class EnrollmentInactivityDetectedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly courseId: string,
    public readonly daysInactive: number,
  ) {}
}

export class EnrollmentActivatedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly courseId: string,
  ) {}
}

/**
 * ENT-61: un paiement hors plateforme a ete refuse par un gestionnaire. Le module notifications previent
 * l'apprenant en lui communiquant le motif.
 */
export class EnrollmentRefusedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly userId: string,
    public readonly courseId: string,
    public readonly reason: string,
  ) {}
}
