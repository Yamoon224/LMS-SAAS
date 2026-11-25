import type { AssessmentsFacade } from "@modules/assessments/assessments.facade";
import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";
import { NotFoundDomainError } from "@shared/errors";

import { EnrollmentStatus } from "../domain/enrollment-status";

import type { CanAccessFinalExamUseCase } from "./can-access-final-exam.use-case";
import { buildEnrollment } from "./enrollment-test-helpers";
import type { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import type { GetEnrollmentUseCase } from "./get-enrollment.use-case";
import { GetLearnerAssessmentOverviewUseCase } from "./get-learner-assessment-overview.use-case";

const baseInfo = {
  requireLiveAttendance: false,
  ruleBlock: null as string | null,
  canStartByRules: true,
  title: "Quiz",
};

describe("GetLearnerAssessmentOverviewUseCase", () => {
  function build(options: {
    enrollment?: ReturnType<typeof buildEnrollment>;
    moduleCourseId?: string;
    quizInfo?: Record<string, unknown> | null;
    examInfo?: Record<string, unknown> | null;
    accessible?: boolean | null;
    liveSatisfied?: boolean;
    allModulesValidated?: boolean;
  }) {
    const getEnrollment = {
      executeOwned: jest.fn().mockResolvedValue(options.enrollment ?? buildEnrollment()),
    } as unknown as GetEnrollmentUseCase;
    const courses = {
      findByIdInTenant: jest.fn().mockResolvedValue({ progressionMode: "SEQUENTIAL" }),
    } as unknown as CoursesFacade;
    const content = {
      assertModuleInTenant: jest.fn().mockResolvedValue(options.moduleCourseId ?? "course-1"),
    } as unknown as CourseContentFacade;
    const assessments = {
      getQuizInfoForEnrollment: jest.fn().mockResolvedValue(options.quizInfo === undefined ? baseInfo : options.quizInfo),
      getExamInfoForEnrollment: jest.fn().mockResolvedValue(options.examInfo === undefined ? baseInfo : options.examInfo),
    } as unknown as AssessmentsFacade;
    const live = {
      isAttendanceSatisfied: jest.fn().mockResolvedValue(options.liveSatisfied ?? true),
    } as unknown as LiveSessionsFacade;
    const modules = {
      execute: jest
        .fn()
        .mockResolvedValue(options.accessible === null ? [] : [{ moduleId: "m1", accessible: options.accessible ?? true }]),
    } as unknown as GetAccessibleModulesUseCase;
    const finalExam = {
      execute: jest.fn().mockResolvedValue(options.allModulesValidated ?? true),
    } as unknown as CanAccessFinalExamUseCase;
    return {
      useCase: new GetLearnerAssessmentOverviewUseCase(getEnrollment, courses, content, assessments, live, modules, finalExam),
      live,
      assessments,
    };
  }

  describe("forModuleQuiz", () => {
    it("404 quand l'accès au contenu n'est plus actif", async () => {
      const { useCase } = build({ enrollment: buildEnrollment({ status: EnrollmentStatus.SUSPENDED }) });
      await expect(useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1")).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it("404 quand le module appartient à une autre formation", async () => {
      const { useCase } = build({ moduleCourseId: "autre-course" });
      await expect(useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1")).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it("404 quand le module n'a pas de quiz", async () => {
      const { useCase } = build({ quizInfo: null });
      await expect(useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1")).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it("autorise le démarrage quand tout est satisfait, sans interroger la présence live non requise", async () => {
      const { useCase, live } = build({});
      const overview = await useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1");
      expect(live.isAttendanceSatisfied).not.toHaveBeenCalled();
      expect(overview).toMatchObject({
        moduleId: "m1",
        moduleAccessible: true,
        liveAttendance: { required: false, satisfied: true },
        canStartNow: true,
        blockedReason: null,
      });
    });

    it("bloque avec LIVE_ATTENDANCE_REQUIRED si la présence live requise manque", async () => {
      const { useCase, live } = build({ quizInfo: { ...baseInfo, requireLiveAttendance: true }, liveSatisfied: false });
      const overview = await useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1");
      expect(live.isAttendanceSatisfied).toHaveBeenCalledWith("user-1", "m1");
      expect(overview.liveAttendance).toEqual({ required: true, satisfied: false });
      expect(overview.blockedReason).toBe("LIVE_ATTENDANCE_REQUIRED");
      expect(overview.canStartNow).toBe(false);
    });

    it("MODULE_LOCKED prime sur la présence live et sur la règle de l'évaluation", async () => {
      const { useCase } = build({
        quizInfo: { ...baseInfo, requireLiveAttendance: true, ruleBlock: "RETRY_TOO_SOON" },
        liveSatisfied: false,
        accessible: false,
      });
      const overview = await useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1");
      expect(overview.moduleAccessible).toBe(false);
      expect(overview.blockedReason).toBe("MODULE_LOCKED");
    });

    it("traite un module absent de la liste d'accès comme verrouillé", async () => {
      const { useCase } = build({ accessible: null });
      const overview = await useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1");
      expect(overview.moduleAccessible).toBe(false);
      expect(overview.blockedReason).toBe("MODULE_LOCKED");
    });

    it("conserve le blocage de règle de l'évaluation et empêche le démarrage", async () => {
      const { useCase } = build({ quizInfo: { ...baseInfo, ruleBlock: "ATTEMPTS_EXHAUSTED" } });
      const overview = await useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1");
      expect(overview.blockedReason).toBe("ATTEMPTS_EXHAUSTED");
      expect(overview.canStartNow).toBe(false);
    });

    it("n'autorise pas le démarrage si les règles de l'évaluation l'interdisent sans motif", async () => {
      const { useCase } = build({ quizInfo: { ...baseInfo, canStartByRules: false } });
      const overview = await useCase.forModuleQuiz("enr-1", "m1", "user-1", "t1");
      expect(overview.blockedReason).toBeNull();
      expect(overview.canStartNow).toBe(false);
    });
  });

  describe("forExam", () => {
    it("404 quand l'accès au contenu n'est plus actif", async () => {
      const { useCase } = build({ enrollment: buildEnrollment({ status: EnrollmentStatus.EXPIRED }) });
      await expect(useCase.forExam("enr-1", "user-1", "t1")).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it("404 quand la formation n'a pas d'examen", async () => {
      const { useCase } = build({ examInfo: null });
      await expect(useCase.forExam("enr-1", "user-1", "t1")).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it("bloque avec MODULES_NOT_VALIDATED tant que tous les modules ne sont pas validés (RG-12)", async () => {
      const { useCase } = build({ allModulesValidated: false });
      const overview = await useCase.forExam("enr-1", "user-1", "t1");
      expect(overview).toMatchObject({
        courseId: "course-1",
        allModulesValidated: false,
        blockedReason: "MODULES_NOT_VALIDATED",
        canStartNow: false,
      });
    });

    it("autorise le démarrage quand les modules sont validés et les règles satisfaites", async () => {
      const { useCase } = build({});
      await expect(useCase.forExam("enr-1", "user-1", "t1")).resolves.toMatchObject({
        allModulesValidated: true,
        blockedReason: null,
        canStartNow: true,
      });
    });

    it("remonte le blocage de règle de l'examen quand les modules sont validés", async () => {
      const { useCase } = build({ examInfo: { ...baseInfo, ruleBlock: "REENTRY_NOT_ALLOWED", canStartByRules: false } });
      const overview = await useCase.forExam("enr-1", "user-1", "t1");
      expect(overview.blockedReason).toBe("REENTRY_NOT_ALLOWED");
      expect(overview.canStartNow).toBe(false);
    });
  });
});
