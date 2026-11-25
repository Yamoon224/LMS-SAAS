import { Injectable, OnModuleInit } from "@nestjs/common";
import { DomainError } from "@shared/errors";
import { LearnerAssessmentGateRegistry } from "@shared/ports/learner-assessment-gate";
import type { LearnerAssessmentGate } from "@shared/ports/learner-assessment-gate";

import { GetLearnerAssessmentOverviewUseCase } from "./get-learner-assessment-overview.use-case";
import { ModuleLockedError } from "./learner-lesson-access";

export class LiveAttendanceRequiredError extends DomainError {
  readonly code = "PRESENCE_LIVE_REQUISE";
}

export class ModulesNotValidatedError extends DomainError {
  readonly code = "MODULES_NON_VALIDES";
}

/**
 * Applique au démarrage d'un quiz / de l'examen les conditions de progression que seul ce module
 * connaît: module déverrouillé (RG-09), présence live (RG-08b), tous les modules validés (RG-12).
 * Une tentative déjà en cours (reprise) n'est jamais bloquée. Les règles de tentatives/délai restent
 * appliquées par assessments (TENTATIVES_EPUISEES, NOUVELLE_TENTATIVE_TROP_TOT).
 */
@Injectable()
export class LearnerAssessmentGateService implements LearnerAssessmentGate, OnModuleInit {
  constructor(
    private readonly overview: GetLearnerAssessmentOverviewUseCase,
    private readonly registry: LearnerAssessmentGateRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async assertCanStartQuiz(enrollmentId: string, moduleId: string, userId: string, tenantId: string): Promise<void> {
    const info = await this.overview.forModuleQuiz(enrollmentId, moduleId, userId, tenantId);
    if (info.inProgressAttemptId) return;
    if (info.blockedReason === "MODULE_LOCKED") {
      throw new ModuleLockedError("Ce module est verrouillé: validez d'abord le module précédent (RG-09).");
    }
    if (info.blockedReason === "LIVE_ATTENDANCE_REQUIRED") {
      throw new LiveAttendanceRequiredError("La présence à la session live est requise avant ce quiz (RG-08).");
    }
  }

  async assertCanStartExam(enrollmentId: string, userId: string, tenantId: string): Promise<void> {
    const info = await this.overview.forExam(enrollmentId, userId, tenantId);
    if (info.inProgressAttemptId) return;
    if (info.blockedReason === "MODULES_NOT_VALIDATED") {
      throw new ModulesNotValidatedError("L'examen final n'est accessible qu'après validation de tous les modules (RG-12).");
    }
  }
}
