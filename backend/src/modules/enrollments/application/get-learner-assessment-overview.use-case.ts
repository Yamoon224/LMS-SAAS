import { AssessmentsFacade } from "@modules/assessments/assessments.facade";
import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";
import { Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { CanAccessFinalExamUseCase } from "./can-access-final-exam.use-case";
import { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import { GetEnrollmentUseCase } from "./get-enrollment.use-case";

type AssessmentInfo = NonNullable<Awaited<ReturnType<AssessmentsFacade["getQuizInfoForEnrollment"]>>>;

export type AssessmentBlockReason =
  | "MODULE_LOCKED"
  | "LIVE_ATTENDANCE_REQUIRED"
  | "MODULES_NOT_VALIDATED"
  | "ATTEMPTS_EXHAUSTED"
  | "RETRY_TOO_SOON"
  | "REENTRY_NOT_ALLOWED";

export type LearnerQuizOverview = AssessmentInfo & {
  moduleId: string;
  moduleAccessible: boolean;
  liveAttendance: { required: boolean; satisfied: boolean };
  canStartNow: boolean;
  blockedReason: AssessmentBlockReason | null;
};

export type LearnerExamOverview = AssessmentInfo & {
  courseId: string;
  allModulesValidated: boolean;
  canStartNow: boolean;
  blockedReason: AssessmentBlockReason | null;
};

/**
 * PUB-10/PUB-11: fiche d'information d'un quiz de module / de l'examen final pour l'apprenant.
 * Combine les règles propres à l'évaluation (assessments) avec les conditions d'accès portées par ce
 * module: déverrouillage séquentiel RG-09, présence live RG-08(b), modules validés RG-12.
 * 404 uniforme si l'inscription n'est pas à l'appelant, hors de son tenant, sans accès actif, ou si le
 * module/l'évaluation n'appartient pas à la formation de l'inscription.
 */
@Injectable()
export class GetLearnerAssessmentOverviewUseCase {
  constructor(
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly assessmentsFacade: AssessmentsFacade,
    private readonly liveSessionsFacade: LiveSessionsFacade,
    private readonly getAccessibleModulesUseCase: GetAccessibleModulesUseCase,
    private readonly canAccessFinalExamUseCase: CanAccessFinalExamUseCase,
  ) {}

  async forModuleQuiz(
    enrollmentId: string,
    moduleId: string,
    userId: string,
    tenantId: string,
  ): Promise<LearnerQuizOverview> {
    const enrollment = await this.getEnrollmentUseCase.executeOwned(enrollmentId, userId, tenantId);
    if (!enrollment.hasContentAccess()) {
      throw new NotFoundDomainError(`Quiz introuvable pour le module: ${moduleId}`);
    }

    const moduleCourseId = await this.courseContentFacade.assertModuleInTenant(moduleId, tenantId);
    if (moduleCourseId !== enrollment.courseId) {
      throw new NotFoundDomainError(`Quiz introuvable pour le module: ${moduleId}`);
    }

    const info = await this.assessmentsFacade.getQuizInfoForEnrollment(enrollmentId, moduleId);
    if (!info) {
      throw new NotFoundDomainError(`Quiz introuvable pour le module: ${moduleId}`);
    }

    const course = await this.coursesFacade.findByIdInTenant(enrollment.courseId, tenantId);
    const access = await this.getAccessibleModulesUseCase.execute(enrollmentId, enrollment.courseId, course.progressionMode);
    const moduleAccessible = access.find((entry) => entry.moduleId === moduleId)?.accessible ?? false;

    const liveRequired = info.requireLiveAttendance === true;
    const liveSatisfied = liveRequired ? await this.liveSessionsFacade.isAttendanceSatisfied(userId, moduleId) : true;

    let blockedReason: AssessmentBlockReason | null = info.ruleBlock;
    if (!liveSatisfied) blockedReason = "LIVE_ATTENDANCE_REQUIRED";
    if (!moduleAccessible) blockedReason = "MODULE_LOCKED";

    return {
      ...info,
      moduleId,
      moduleAccessible,
      liveAttendance: { required: liveRequired, satisfied: liveSatisfied },
      canStartNow: blockedReason === null && info.canStartByRules,
      blockedReason,
    };
  }

  async forExam(enrollmentId: string, userId: string, tenantId: string): Promise<LearnerExamOverview> {
    const enrollment = await this.getEnrollmentUseCase.executeOwned(enrollmentId, userId, tenantId);
    if (!enrollment.hasContentAccess()) {
      throw new NotFoundDomainError("Examen introuvable.");
    }

    const info = await this.assessmentsFacade.getExamInfoForEnrollment(enrollmentId, enrollment.courseId);
    if (!info) {
      throw new NotFoundDomainError("Examen introuvable.");
    }

    const allModulesValidated = await this.canAccessFinalExamUseCase.execute(enrollmentId, enrollment.courseId);
    const blockedReason: AssessmentBlockReason | null = allModulesValidated ? info.ruleBlock : "MODULES_NOT_VALIDATED";

    return {
      ...info,
      courseId: enrollment.courseId,
      allModulesValidated,
      canStartNow: blockedReason === null && info.canStartByRules,
      blockedReason,
    };
  }
}
