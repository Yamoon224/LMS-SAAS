import type { AssessmentsFacade } from "@modules/assessments/assessments.facade";
import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import { CanAccessFinalExamUseCase } from "./can-access-final-exam.use-case";
import { CheckModuleCompletionUseCase } from "./check-module-completion.use-case";
import { buildEnrollment, buildProgress } from "./enrollment-test-helpers";
import { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import { GetEnrollmentProgressUseCase } from "./get-enrollment-progress.use-case";
import { GetLearnerCourseContentUseCase } from "./get-learner-course-content.use-case";
import type { GetEnrollmentUseCase } from "./get-enrollment.use-case";
import type { ResolveLearnerContentLocaleUseCase } from "./learner-content-locale.use-cases";
import { ListEnrollmentsUseCase } from "./list-enrollments.use-case";
import { EnrollmentStatus } from "../domain/enrollment-status";

/** Leçon factice : isCompletedBy exige watchedPercent >= threshold, sinon simple ouverture. */
function lesson(id: string, opts: { mandatory?: boolean; threshold?: number; order?: number; title?: string } = {}) {
  return {
    id,
    title: opts.title ?? `Leçon ${id}`,
    order: opts.order ?? 1,
    resourceType: "VIDEO",
    isMandatory: opts.mandatory ?? true,
    isCompletedBy: (p: { watchedPercent: number | null; opened: boolean }) =>
      opts.threshold === undefined ? p.opened : (p.watchedPercent ?? 0) >= opts.threshold,
  };
}

describe("CheckModuleCompletionUseCase (RG-08)", () => {
  function build(options: {
    enrollment?: ReturnType<typeof buildEnrollment> | null;
    lessons: ReturnType<typeof lesson>[];
    progress?: ReturnType<typeof buildProgress>[];
    quizPassed?: boolean | null;
    live?: boolean;
  }) {
    const enrollments = {
      findById: jest.fn().mockResolvedValue(options.enrollment === undefined ? buildEnrollment() : options.enrollment),
    } as unknown as EnrollmentRepositoryPort;
    const progress = { listByEnrollment: jest.fn().mockResolvedValue(options.progress ?? []) } as unknown as ProgressRepositoryPort;
    const content = { listLessons: jest.fn().mockResolvedValue(options.lessons) } as unknown as CourseContentFacade;
    const assessments = {
      isModuleQuizPassed: jest.fn().mockResolvedValue(options.quizPassed === undefined ? null : options.quizPassed),
    } as unknown as AssessmentsFacade;
    const live = { isAttendanceSatisfied: jest.fn().mockResolvedValue(options.live ?? true) } as unknown as LiveSessionsFacade;
    return { useCase: new CheckModuleCompletionUseCase(progress, enrollments, content, assessments, live), assessments, live };
  }

  it("lève NotFound si l'inscription est inconnue", async () => {
    const { useCase } = build({ enrollment: null, lessons: [] });
    await expect(useCase.execute("enr-1", "m1")).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("valide un module dont les contenus obligatoires sont consultés, présence live et quiz OK", async () => {
    const { useCase, assessments, live } = build({
      lessons: [lesson("l1"), lesson("l2", { mandatory: false })],
      progress: [buildProgress({ lessonId: "l1", opened: true })],
      quizPassed: true,
    });
    await expect(useCase.execute("enr-1", "m1")).resolves.toBe(true);
    expect(assessments.isModuleQuizPassed).toHaveBeenCalledWith("enr-1", "m1");
    expect(live.isAttendanceSatisfied).toHaveBeenCalledWith("user-1", "m1");
  });

  it("refuse si un contenu obligatoire n'a pas de progression", async () => {
    const { useCase } = build({ lessons: [lesson("l1")], progress: [] });
    await expect(useCase.execute("enr-1", "m1")).resolves.toBe(false);
  });

  it("refuse si le critère de visionnage n'est pas atteint", async () => {
    const { useCase } = build({
      lessons: [lesson("l1", { threshold: 90 })],
      progress: [buildProgress({ lessonId: "l1", opened: true, watchedPercent: 50 })],
    });
    await expect(useCase.execute("enr-1", "m1")).resolves.toBe(false);
  });

  it("refuse si la présence live manque ou si le quiz est échoué", async () => {
    const ok = { lessons: [lesson("l1")], progress: [buildProgress({ lessonId: "l1", opened: true })] };
    await expect(build({ ...ok, live: false }).useCase.execute("enr-1", "m1")).resolves.toBe(false);
    await expect(build({ ...ok, quizPassed: false }).useCase.execute("enr-1", "m1")).resolves.toBe(false);
  });
});

describe("CanAccessFinalExamUseCase (RG-12)", () => {
  function build(modules: Array<{ id: string }>, validated: Record<string, boolean>) {
    const content = { listModules: jest.fn().mockResolvedValue(modules) } as unknown as CourseContentFacade;
    const check = {
      execute: jest.fn().mockImplementation((_e: string, m: string) => Promise.resolve(validated[m])),
    } as unknown as CheckModuleCompletionUseCase;
    return { useCase: new CanAccessFinalExamUseCase(content, check), check };
  }

  it("autorise l'examen d'une formation sans module", async () => {
    const { useCase, check } = build([], {});
    await expect(useCase.execute("enr-1", "c1")).resolves.toBe(true);
    expect(check.execute).not.toHaveBeenCalled();
  });

  it("autorise quand tous les modules sont validés", async () => {
    const { useCase } = build([{ id: "m1" }, { id: "m2" }], { m1: true, m2: true });
    await expect(useCase.execute("enr-1", "c1")).resolves.toBe(true);
  });

  it("refuse dès qu'un module n'est pas validé", async () => {
    const { useCase, check } = build([{ id: "m1" }, { id: "m2" }], { m1: false, m2: true });
    await expect(useCase.execute("enr-1", "c1")).resolves.toBe(false);
    expect(check.execute).toHaveBeenCalledTimes(1);
  });
});

describe("GetAccessibleModulesUseCase (RG-09)", () => {
  const modules = [
    { id: "m1", title: "Un", order: 1 },
    { id: "m2", title: "Deux", order: 2 },
  ];
  function build(validated: Record<string, boolean>) {
    const content = { listModules: jest.fn().mockResolvedValue(modules) } as unknown as CourseContentFacade;
    const check = {
      execute: jest.fn().mockImplementation((_e: string, m: string) => Promise.resolve(validated[m])),
    } as unknown as CheckModuleCompletionUseCase;
    return new GetAccessibleModulesUseCase(content, check);
  }

  it("verrouille le module suivant en mode séquentiel tant que le précédent n'est pas validé", async () => {
    const result = await build({ m1: false, m2: false }).execute("enr-1", "c1", "SEQUENTIAL");
    expect(result).toEqual([
      { moduleId: "m1", title: "Un", order: 1, validated: false, accessible: true },
      { moduleId: "m2", title: "Deux", order: 2, validated: false, accessible: false },
    ]);
  });

  it("déverrouille le module suivant une fois le précédent validé", async () => {
    const result = await build({ m1: true, m2: false }).execute("enr-1", "c1", "SEQUENTIAL");
    expect(result.map((r) => r.accessible)).toEqual([true, true]);
  });

  it("laisse tout accessible en mode libre", async () => {
    const result = await build({ m1: false, m2: false }).execute("enr-1", "c1", "FREE");
    expect(result.map((r) => r.accessible)).toEqual([true, true]);
  });
});

describe("GetEnrollmentProgressUseCase", () => {
  function build(enrollment: ReturnType<typeof buildEnrollment> | null) {
    const enrollments = { findById: jest.fn().mockResolvedValue(enrollment) } as unknown as EnrollmentRepositoryPort;
    const progress = {
      listByEnrollment: jest.fn().mockResolvedValue([
        buildProgress({ lessonId: "l1", opened: true }),
        buildProgress({ lessonId: "l2", opened: false }),
      ]),
    } as unknown as ProgressRepositoryPort;
    const lessonsByModule: Record<string, ReturnType<typeof lesson>[]> = {
      m1: [lesson("l1"), lesson("l2")],
      m2: [lesson("l3")],
    };
    const content = {
      listModules: jest.fn().mockResolvedValue([{ id: "m1" }, { id: "m2" }]),
      listLessons: jest.fn().mockImplementation((id: string) => Promise.resolve(lessonsByModule[id])),
    } as unknown as CourseContentFacade;
    return new GetEnrollmentProgressUseCase(enrollments, progress, content);
  }

  it("lève NotFound si l'inscription est inconnue", async () => {
    await expect(build(null).execute("x")).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("compte les leçons terminées (ouvertes + critère) sur le total de la formation", async () => {
    await expect(build(buildEnrollment()).execute("enr-1")).resolves.toEqual({ completedLessons: 1, totalLessons: 3 });
  });
});

describe("ListEnrollmentsUseCase", () => {
  it("délègue au dépôt par utilisateur et par formation (avec filtre de statut)", async () => {
    const list = [buildEnrollment()];
    const repo = {
      listByUser: jest.fn().mockResolvedValue(list),
      listByCourse: jest.fn().mockResolvedValue(list),
    } as unknown as EnrollmentRepositoryPort;
    const useCase = new ListEnrollmentsUseCase(repo);
    await expect(useCase.listForUser("u1")).resolves.toBe(list);
    await expect(useCase.listForCourse("c1", EnrollmentStatus.ACTIVE)).resolves.toBe(list);
    await expect(useCase.listForCourse("c1")).resolves.toBe(list);
    expect(repo.listByUser).toHaveBeenCalledWith("u1");
    expect(repo.listByCourse).toHaveBeenNthCalledWith(1, "c1", EnrollmentStatus.ACTIVE);
    expect(repo.listByCourse).toHaveBeenNthCalledWith(2, "c1", undefined);
  });
});

describe("GetLearnerCourseContentUseCase (PUB-09)", () => {
  function build(options: { enrollment?: ReturnType<typeof buildEnrollment>; appliedLocale?: string | null }) {
    const getEnrollment = {
      executeOwned: jest.fn().mockResolvedValue(options.enrollment ?? buildEnrollment()),
    } as unknown as GetEnrollmentUseCase;
    const courses = {
      findByIdInTenant: jest.fn().mockResolvedValue({ progressionMode: "FREE", sourceLocale: "fr" }),
    } as unknown as CoursesFacade;
    const content = {
      listPublishedLessonTitles: jest.fn().mockResolvedValue(new Map([["l1", "Lesson one"]])),
      listLessons: jest.fn().mockImplementation((moduleId: string) =>
        Promise.resolve(
          moduleId === "m1"
            ? [lesson("l2", { order: 2 }), lesson("l1", { order: 1, title: "Leçon un" })]
            : [lesson("l3", { order: 1 })],
        ),
      ),
    } as unknown as CourseContentFacade;
    const access = {
      execute: jest.fn().mockResolvedValue([
        { moduleId: "m2", title: "Deux", order: 2, validated: false, accessible: false },
        { moduleId: "m1", title: "Un", order: 1, validated: true, accessible: true },
      ]),
    } as unknown as GetAccessibleModulesUseCase;
    const progress = {
      listByEnrollment: jest.fn().mockResolvedValue([buildProgress({ lessonId: "l1", opened: true })]),
    } as unknown as ProgressRepositoryPort;
    const locale = {
      execute: jest.fn().mockResolvedValue(options.appliedLocale ?? null),
    } as unknown as ResolveLearnerContentLocaleUseCase;
    return { useCase: new GetLearnerCourseContentUseCase(getEnrollment, courses, content, access, progress, locale), content, locale };
  }

  it("renvoie les modules et leçons triés avec l'état de complétion", async () => {
    const { useCase, content } = build({});
    const result = await useCase.execute("enr-1", "user-1", "t1");
    expect(content.listPublishedLessonTitles).not.toHaveBeenCalled();
    expect(result.contentLocale).toBe("fr");
    expect(result.progressionMode).toBe("FREE");
    expect(result.modules.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(result.modules[0].lessons.map((l) => [l.id, l.title, l.completed])).toEqual([
      ["l1", "Leçon un", true],
      ["l2", "Leçon l2", false],
    ]);
    expect(result.modules[1]).toMatchObject({ accessible: false, validated: false });
  });

  it("applique les titres traduits quand la langue demandée est lisible", async () => {
    const { useCase, locale } = build({ appliedLocale: "en" });
    const result = await useCase.execute("enr-1", "user-1", "t1", "en");
    expect(locale.execute).toHaveBeenCalledWith("course-1", "fr", "en");
    expect(result.contentLocale).toBe("en");
    expect(result.modules[0].lessons[0].title).toBe("Lesson one");
    expect(result.modules[0].lessons[1].title).toBe("Leçon l2");
  });

  it("répond 404 quand l'accès au contenu n'est plus actif", async () => {
    const { useCase } = build({ enrollment: buildEnrollment({ status: EnrollmentStatus.EXPIRED }) });
    await expect(useCase.execute("enr-1", "user-1", "t1")).rejects.toBeInstanceOf(NotFoundDomainError);
  });
});
