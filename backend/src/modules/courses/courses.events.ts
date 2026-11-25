/**
 * Événements de domaine publics du module courses. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */
export class CourseCreatedEvent {
  constructor(
    public readonly courseId: string,
    public readonly tenantId: string,
  ) {}
}

export class CoursePublishedEvent {
  constructor(
    public readonly courseId: string,
    public readonly tenantId: string,
  ) {}
}

export class CourseArchivedEvent {
  constructor(
    public readonly courseId: string,
    public readonly tenantId: string,
  ) {}
}

export class CourseDuplicatedEvent {
  constructor(
    public readonly sourceCourseId: string,
    public readonly newCourseId: string,
    public readonly tenantId: string,
  ) {}
}
