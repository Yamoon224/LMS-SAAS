import { Injectable } from "@nestjs/common";

/**
 * Condition d'accès à une évaluation qui dépend de la progression de l'apprenant (déverrouillage
 * séquentiel RG-09, présence live RG-08(b), modules validés RG-12). Cette progression appartient au
 * module enrollments, qui dépend déjà d'assessments : l'inversion de dépendance passe donc par ce port
 * partagé (enregistré par enrollments au démarrage, consommé par assessments) au lieu d'un import circulaire.
 * Chaque méthode lève une erreur de domaine si le démarrage est interdit.
 */
export interface LearnerAssessmentGate {
  assertCanStartQuiz(enrollmentId: string, moduleId: string, userId: string, tenantId: string): Promise<void>;
  assertCanStartExam(enrollmentId: string, userId: string, tenantId: string): Promise<void>;
}

/** Registre (singleton global) auprès duquel le module enrollments enregistre son implémentation. */
@Injectable()
export class LearnerAssessmentGateRegistry {
  private gate: LearnerAssessmentGate | null = null;

  register(gate: LearnerAssessmentGate): void {
    this.gate = gate;
  }

  get(): LearnerAssessmentGate | null {
    return this.gate;
  }
}
