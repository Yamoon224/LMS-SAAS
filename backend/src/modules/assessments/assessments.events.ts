/**
 * Événements de domaine publics du module assessments. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */
export class QuizPassedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly quizId: string,
  ) {}
}

export class ExamPassedEvent {
  constructor(
    public readonly enrollmentId: string,
    public readonly examId: string,
  ) {}
}
