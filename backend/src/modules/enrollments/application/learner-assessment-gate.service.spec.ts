import { LearnerAssessmentGateRegistry } from "@shared/ports/learner-assessment-gate";

import type { GetLearnerAssessmentOverviewUseCase } from "./get-learner-assessment-overview.use-case";
import {
  LearnerAssessmentGateService,
  LiveAttendanceRequiredError,
  ModulesNotValidatedError,
} from "./learner-assessment-gate.service";
import { ModuleLockedError } from "./learner-lesson-access";

function build(quiz: Record<string, unknown>, exam: Record<string, unknown> = {}) {
  const overview = {
    forModuleQuiz: jest.fn().mockResolvedValue({ inProgressAttemptId: null, blockedReason: null, ...quiz }),
    forExam: jest.fn().mockResolvedValue({ inProgressAttemptId: null, blockedReason: null, ...exam }),
  } as unknown as GetLearnerAssessmentOverviewUseCase;
  const registry = new LearnerAssessmentGateRegistry();
  const service = new LearnerAssessmentGateService(overview, registry);
  return { service, registry };
}

describe("LearnerAssessmentGateService", () => {
  it("s'enregistre auprès du registre partagé au démarrage", () => {
    const { service, registry } = build({});
    expect(registry.get()).toBeNull();
    service.onModuleInit();
    expect(registry.get()).toBe(service);
  });

  it("quiz: module verrouillé (RG-09) refusé", async () => {
    const { service } = build({ blockedReason: "MODULE_LOCKED" });
    await expect(service.assertCanStartQuiz("e", "m", "u", "t")).rejects.toThrow(ModuleLockedError);
  });

  it("quiz: présence live requise (RG-08b) refusée", async () => {
    const { service } = build({ blockedReason: "LIVE_ATTENDANCE_REQUIRED" });
    await expect(service.assertCanStartQuiz("e", "m", "u", "t")).rejects.toThrow(LiveAttendanceRequiredError);
  });

  it("quiz: les blocages de tentatives restent à la charge d'assessments (pas d'erreur ici)", async () => {
    const { service } = build({ blockedReason: "ATTEMPTS_EXHAUSTED" });
    await expect(service.assertCanStartQuiz("e", "m", "u", "t")).resolves.toBeUndefined();
  });

  it("quiz: une tentative en cours est toujours reprise", async () => {
    const { service } = build({ blockedReason: "MODULE_LOCKED", inProgressAttemptId: "att" });
    await expect(service.assertCanStartQuiz("e", "m", "u", "t")).resolves.toBeUndefined();
  });

  it("examen: modules non validés (RG-12) refusé, validés accepté", async () => {
    const blocked = build({}, { blockedReason: "MODULES_NOT_VALIDATED" });
    await expect(blocked.service.assertCanStartExam("e", "u", "t")).rejects.toThrow(ModulesNotValidatedError);
    const ok = build({}, {});
    await expect(ok.service.assertCanStartExam("e", "u", "t")).resolves.toBeUndefined();
  });
});
