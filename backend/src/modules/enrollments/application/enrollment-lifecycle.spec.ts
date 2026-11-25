import type { ExamPassedEvent, QuizPassedEvent } from "@modules/assessments/assessments.events";
import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { PaymentSucceededEvent } from "@modules/payments/payments.events";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { EnrollmentStatus } from "../domain/enrollment-status";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";
import { ProgressState } from "../domain/progress-state";
import { EnrollmentActivatedEvent, EnrollmentCompletedEvent } from "../enrollments.events";

import { ActivatePaidEnrollmentListener } from "./activate-paid-enrollment.listener";
import type { CheckModuleCompletionUseCase } from "./check-module-completion.use-case";
import { CompleteEnrollmentOnExamPassedListener } from "./complete-enrollment-on-exam-passed.listener";
import { CompleteNonCertifyingCourseUseCase } from "./complete-non-certifying-course.use-case";
import { buildEnrollment, buildProgress } from "./enrollment-test-helpers";
import { ExpireOverdueEnrollmentsUseCase } from "./expire-overdue-enrollments.use-case";
import { ManageEnrollmentUseCase } from "./manage-enrollment.use-case";
import { RecheckCompletionListener } from "./recheck-completion.listener";
import { LessonViewedEvent, NoContentAccessError, RecordLessonViewUseCase } from "./record-lesson-view.use-case";
import { ResetProgressUseCase } from "./reset-progress.use-case";

function repoWith(enrollment: ReturnType<typeof buildEnrollment> | null) {
  return {
    findById: jest.fn().mockResolvedValue(enrollment),
    save: jest.fn().mockResolvedValue(undefined),
  } as unknown as EnrollmentRepositoryPort;
}

const emitter = () => ({ emit: jest.fn() }) as unknown as EventEmitter2;

describe("ActivatePaidEnrollmentListener (RG-06)", () => {
  function build(enrollment: ReturnType<typeof buildEnrollment> | null) {
    const repo = repoWith(enrollment);
    const courses = { findById: jest.fn().mockResolvedValue({ accessDurationDays: 30 }) } as unknown as CoursesFacade;
    const em = emitter();
    return { listener: new ActivatePaidEnrollmentListener(repo, courses, em), repo, courses, em };
  }
  const evt = (payment: Record<string, unknown>) => ({ payment }) as unknown as PaymentSucceededEvent;

  it("ignore un paiement qui n'est pas une inscription", async () => {
    const { listener, repo } = build(buildEnrollment());
    await listener.handle(evt({ type: "SUBSCRIPTION", enrollmentId: "enr-1" }));
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it("ignore un paiement d'inscription sans enrollmentId", async () => {
    const { listener, repo } = build(buildEnrollment());
    await listener.handle(evt({ type: "COURSE_ENROLLMENT", enrollmentId: null }));
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it("ne fait rien si l'inscription est introuvable", async () => {
    const { listener, repo, em } = build(null);
    await listener.handle(evt({ type: "COURSE_ENROLLMENT", enrollmentId: "enr-1" }));
    expect(repo.save).not.toHaveBeenCalled();
    expect(em.emit).not.toHaveBeenCalled();
  });

  it("active l'inscription avec la durée d'accès du cours et publie enrollment.activated", async () => {
    const enrollment = buildEnrollment({ status: EnrollmentStatus.PENDING_PAYMENT, startedAt: new Date("2026-01-01T00:00:00Z") });
    const { listener, repo, em } = build(enrollment);
    await listener.handle(evt({ type: "COURSE_ENROLLMENT", enrollmentId: "enr-1" }));
    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.expiresAt).toEqual(new Date(new Date("2026-01-01T00:00:00Z").setDate(31)));
    expect(repo.save).toHaveBeenCalledWith(enrollment);
    expect(em.emit).toHaveBeenCalledWith("enrollment.activated", new EnrollmentActivatedEvent("enr-1", "user-1", "course-1"));
  });

  it("propage l'erreur de transition si l'inscription ne peut pas être activée", async () => {
    const { listener, repo } = build(buildEnrollment({ status: EnrollmentStatus.REFUSED }));
    await expect(listener.handle(evt({ type: "COURSE_ENROLLMENT", enrollmentId: "enr-1" }))).rejects.toBeInstanceOf(
      InvalidStateTransitionError,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("CompleteEnrollmentOnExamPassedListener (RG-13)", () => {
  it("complète l'inscription et publie enrollment.completed", async () => {
    const enrollment = buildEnrollment();
    const repo = repoWith(enrollment);
    const em = emitter();
    await new CompleteEnrollmentOnExamPassedListener(repo, em).handle({ enrollmentId: "enr-1" } as ExamPassedEvent);
    expect(enrollment.status).toBe(EnrollmentStatus.COMPLETED);
    expect(enrollment.completedAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalledWith(enrollment);
    expect(em.emit).toHaveBeenCalledWith("enrollment.completed", new EnrollmentCompletedEvent("enr-1", "user-1", "course-1"));
  });

  it("ne publie rien si l'inscription est introuvable", async () => {
    const repo = repoWith(null);
    const em = emitter();
    await new CompleteEnrollmentOnExamPassedListener(repo, em).handle({ enrollmentId: "x" } as ExamPassedEvent);
    expect(repo.save).not.toHaveBeenCalled();
    expect(em.emit).not.toHaveBeenCalled();
  });
});

describe("CompleteNonCertifyingCourseUseCase (RG-21)", () => {
  function build(options: {
    enrollment?: ReturnType<typeof buildEnrollment> | null;
    courseType?: string;
    modules?: Array<{ id: string }>;
    validated?: Record<string, boolean>;
  }) {
    const repo = repoWith(options.enrollment === undefined ? buildEnrollment() : options.enrollment);
    const courses = {
      findById: jest.fn().mockResolvedValue({ id: "course-1", type: options.courseType ?? "NON_CERTIFYING" }),
    } as unknown as CoursesFacade;
    const content = {
      listModules: jest.fn().mockResolvedValue(options.modules ?? [{ id: "m1" }, { id: "m2" }]),
    } as unknown as CourseContentFacade;
    const check = {
      execute: jest.fn().mockImplementation((_e: string, m: string) => Promise.resolve(options.validated?.[m] ?? true)),
    } as unknown as CheckModuleCompletionUseCase;
    const em = emitter();
    return { useCase: new CompleteNonCertifyingCourseUseCase(repo, courses, content, check, em), repo, check, em, courses };
  }

  it("ne fait rien si l'inscription est introuvable", async () => {
    const { useCase, courses } = build({ enrollment: null });
    await useCase.execute("enr-1");
    expect(courses.findById).not.toHaveBeenCalled();
  });

  it("ignore une formation certifiante", async () => {
    const { useCase, repo, check } = build({ courseType: "CERTIFYING" });
    await useCase.execute("enr-1");
    expect(check.execute).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("ignore une inscription qui n'est plus active", async () => {
    const { useCase, check } = build({ enrollment: buildEnrollment({ status: EnrollmentStatus.SUSPENDED }) });
    await useCase.execute("enr-1");
    expect(check.execute).not.toHaveBeenCalled();
  });

  it("ne complète pas une formation sans module", async () => {
    const { useCase, repo } = build({ modules: [] });
    await useCase.execute("enr-1");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("s'arrête au premier module non validé", async () => {
    const { useCase, check, repo, em } = build({ validated: { m1: false } });
    await useCase.execute("enr-1");
    expect(check.execute).toHaveBeenCalledTimes(1);
    expect(repo.save).not.toHaveBeenCalled();
    expect(em.emit).not.toHaveBeenCalled();
  });

  it("complète l'inscription quand tous les modules sont validés et publie enrollment.completed", async () => {
    const enrollment = buildEnrollment();
    const { useCase, repo, em } = build({ enrollment });
    await useCase.execute("enr-1");
    expect(enrollment.status).toBe(EnrollmentStatus.COMPLETED);
    expect(repo.save).toHaveBeenCalledWith(enrollment);
    expect(em.emit).toHaveBeenCalledWith("enrollment.completed", new EnrollmentCompletedEvent("enr-1", "user-1", "course-1"));
  });
});

describe("RecheckCompletionListener", () => {
  it("réévalue la complétion sur lesson.viewed et quiz.passed", async () => {
    const complete = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as CompleteNonCertifyingCourseUseCase;
    const listener = new RecheckCompletionListener(complete);
    await listener.onLessonViewed(new LessonViewedEvent("enr-1", "l1"));
    await listener.onQuizPassed({ enrollmentId: "enr-2" } as QuizPassedEvent);
    expect(complete.execute).toHaveBeenNthCalledWith(1, "enr-1");
    expect(complete.execute).toHaveBeenNthCalledWith(2, "enr-2");
  });
});

describe("ManageEnrollmentUseCase (ENT-64)", () => {
  it("suspend puis réactive l'inscription", async () => {
    const enrollment = buildEnrollment();
    const repo = repoWith(enrollment);
    const useCase = new ManageEnrollmentUseCase(repo);
    await useCase.suspend("enr-1");
    expect(enrollment.status).toBe(EnrollmentStatus.SUSPENDED);
    await useCase.reactivate("enr-1");
    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it("prolonge l'accès du nombre de jours demandé", async () => {
    const enrollment = buildEnrollment({ expiresAt: new Date("2026-02-01T00:00:00Z") });
    const repo = repoWith(enrollment);
    await new ManageEnrollmentUseCase(repo).extendAccess("enr-1", 10);
    expect(enrollment.expiresAt).toEqual(new Date(new Date("2026-02-01T00:00:00Z").setDate(11)));
    expect(repo.save).toHaveBeenCalledWith(enrollment);
  });

  it("lève NotFound pour une inscription inconnue, sans sauvegarder", async () => {
    const repo = repoWith(null);
    const useCase = new ManageEnrollmentUseCase(repo);
    await expect(useCase.suspend("x")).rejects.toBeInstanceOf(NotFoundDomainError);
    await expect(useCase.reactivate("x")).rejects.toBeInstanceOf(NotFoundDomainError);
    await expect(useCase.extendAccess("x", 5)).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("refuse de suspendre une inscription terminée", async () => {
    const repo = repoWith(buildEnrollment({ status: EnrollmentStatus.COMPLETED }));
    await expect(new ManageEnrollmentUseCase(repo).suspend("enr-1")).rejects.toBeInstanceOf(InvalidStateTransitionError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("ExpireOverdueEnrollmentsUseCase (BE-12)", () => {
  it("expire chaque inscription échue et renvoie leur nombre", async () => {
    const a = buildEnrollment({ id: "a" });
    const b = buildEnrollment({ id: "b" });
    const now = new Date("2026-06-01T00:00:00Z");
    const repo = {
      listExpiredButStillActive: jest.fn().mockResolvedValue([a, b]),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as EnrollmentRepositoryPort;
    await expect(new ExpireOverdueEnrollmentsUseCase(repo).execute(now)).resolves.toBe(2);
    expect(repo.listExpiredButStillActive).toHaveBeenCalledWith(now);
    expect(a.status).toBe(EnrollmentStatus.EXPIRED);
    expect(b.status).toBe(EnrollmentStatus.EXPIRED);
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it("renvoie 0 sans rien sauvegarder quand rien n'est échu", async () => {
    const repo = {
      listExpiredButStillActive: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    } as unknown as EnrollmentRepositoryPort;
    await expect(new ExpireOverdueEnrollmentsUseCase(repo).execute()).resolves.toBe(0);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("ResetProgressUseCase", () => {
  it("supprime toute la progression de l'inscription", async () => {
    const progress = { deleteAllForEnrollment: jest.fn().mockResolvedValue(undefined) } as unknown as ProgressRepositoryPort;
    await new ResetProgressUseCase(progress).execute("enr-1");
    expect(progress.deleteAllForEnrollment).toHaveBeenCalledWith("enr-1");
  });
});

describe("RecordLessonViewUseCase (PUB-09)", () => {
  function build(enrollment: ReturnType<typeof buildEnrollment> | null, existing: ReturnType<typeof buildProgress> | null) {
    const enrollments = repoWith(enrollment);
    const created = buildProgress();
    const progress = {
      findByEnrollmentAndLesson: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue(created),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProgressRepositoryPort;
    const em = emitter();
    return { useCase: new RecordLessonViewUseCase(progress, enrollments, em), progress, created, em };
  }

  it("lève NotFound si l'inscription est inconnue", async () => {
    const { useCase } = build(null, null);
    await expect(useCase.execute("enr-1", "lesson-1")).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("refuse l'accès quand le contenu n'est plus accessible (RG-17)", async () => {
    const { useCase, progress } = build(buildEnrollment({ status: EnrollmentStatus.EXPIRED }), null);
    await expect(useCase.execute("enr-1", "lesson-1")).rejects.toBeInstanceOf(NoContentAccessError);
    expect(progress.save).not.toHaveBeenCalled();
  });

  it("crée la progression au premier accès, l'enregistre et publie lesson.viewed", async () => {
    const { useCase, progress, created, em } = build(buildEnrollment(), null);
    await useCase.execute("enr-1", "lesson-1", 40);
    expect(progress.create).toHaveBeenCalledWith("enr-1", "lesson-1");
    expect(created.state).toBe(ProgressState.IN_PROGRESS);
    expect(created.opened).toBe(true);
    expect(created.watchedPercent).toBe(40);
    expect(progress.save).toHaveBeenCalledWith(created);
    expect(em.emit).toHaveBeenCalledWith("lesson.viewed", new LessonViewedEvent("enr-1", "lesson-1"));
  });

  it("réutilise la progression existante sans en créer une autre", async () => {
    const existing = buildProgress({ watchedPercent: 10, opened: true, state: ProgressState.IN_PROGRESS });
    const { useCase, progress } = build(buildEnrollment(), existing);
    await useCase.execute("enr-1", "lesson-1");
    expect(progress.create).not.toHaveBeenCalled();
    expect(existing.watchedPercent).toBe(10);
    expect(progress.save).toHaveBeenCalledWith(existing);
  });
});
