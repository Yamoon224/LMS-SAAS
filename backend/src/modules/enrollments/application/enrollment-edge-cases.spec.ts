import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { MediaFacade } from "@modules/media/media.facade";
import type { PaymentsFacade } from "@modules/payments/payments.facade";
import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import type { UsersFacade } from "@modules/users/users.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { EnrollmentStatus } from "../domain/enrollment-status";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";
import { EnrollmentActivatedEvent } from "../enrollments.events";

import {
  AlreadyEnrolledError,
  CourseNotPurchasableError,
  EnrollInCourseUseCase,
  EnrollmentCreatedEvent,
} from "./enroll-in-course.use-case";
import { buildEnrollment, buildProgress } from "./enrollment-test-helpers";
import type { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import type { GetEnrollmentUseCase } from "./get-enrollment.use-case";
import { GetLearnerLessonUseCase } from "./get-learner-lesson.use-case";
import {
  EnrollmentNotPayableError,
  InitiateEnrollmentPaymentUseCase,
} from "./initiate-enrollment-payment.use-case";
import type { ResolveLearnerContentLocaleUseCase } from "./learner-content-locale.use-cases";

describe("EnrollInCourseUseCase (RG-05 / RG-20)", () => {
  const input = { userId: "user-1", tenantId: "t1", courseId: "course-1", locale: "fr", isOfflinePayment: false };

  function build(course: Record<string, unknown>, existing: unknown = null) {
    const repo = {
      findByUserAndCourse: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve(buildEnrollment({ id: "enr-new", ...(data as object), startedAt: null } as never)),
      ),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as EnrollmentRepositoryPort;
    const courses = {
      findByIdInTenant: jest.fn().mockResolvedValue({
        price: 5000,
        currency: "XOF",
        accessDurationDays: null,
        isPurchasable: () => true,
        ...course,
      }),
    } as unknown as CoursesFacade;
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    return { useCase: new EnrollInCourseUseCase(repo, courses, emitter), repo, emitter };
  }

  it("refuse une double inscription (RG-20)", async () => {
    const { useCase, repo } = build({}, buildEnrollment());
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(AlreadyEnrolledError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("refuse une formation non achetable", async () => {
    const { useCase, repo } = build({ isPurchasable: () => false });
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(CourseNotPurchasableError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("crée une inscription payante en attente de paiement avec le prix figé, sans l'activer", async () => {
    const { useCase, repo, emitter } = build({});
    const enrollment = await useCase.execute(input);
    expect(repo.create).toHaveBeenCalledWith({
      userId: "user-1",
      courseId: "course-1",
      status: EnrollmentStatus.PENDING_PAYMENT,
      pricePaid: 5000,
      currency: "XOF",
      locale: "fr",
    });
    expect(enrollment.status).toBe(EnrollmentStatus.PENDING_PAYMENT);
    expect(repo.save).not.toHaveBeenCalled();
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith("enrollment.created", new EnrollmentCreatedEvent("enr-new", "user-1", "course-1", 5000));
  });

  it("met une inscription hors plateforme en attente de validation", async () => {
    const { useCase, repo } = build({});
    const enrollment = await useCase.execute({ ...input, isOfflinePayment: true });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: EnrollmentStatus.PENDING_VALIDATION }));
    expect(enrollment.status).toBe(EnrollmentStatus.PENDING_VALIDATION);
  });

  it("active immédiatement une formation gratuite, même déclarée hors plateforme", async () => {
    const { useCase, repo, emitter } = build({ price: 0, accessDurationDays: 10 });
    const enrollment = await useCase.execute({ ...input, isOfflinePayment: true });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: EnrollmentStatus.PENDING_PAYMENT, pricePaid: 0 }));
    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.expiresAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalledWith(enrollment);
    expect(emitter.emit).toHaveBeenCalledWith("enrollment.activated", new EnrollmentActivatedEvent("enr-new", "user-1", "course-1"));
    expect(emitter.emit).toHaveBeenCalledWith("enrollment.created", expect.any(EnrollmentCreatedEvent));
  });

  it("active une formation gratuite sans durée d'accès sans date d'expiration", async () => {
    const { useCase } = build({ price: 0, accessDurationDays: undefined });
    const enrollment = await useCase.execute(input);
    expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    expect(enrollment.expiresAt).toBeNull();
  });
});

describe("InitiateEnrollmentPaymentUseCase - cas limites", () => {
  function build(options: { enrollment?: ReturnType<typeof buildEnrollment>; user?: unknown; tenant?: unknown; checkoutUrl?: string }) {
    const getEnrollment = {
      executeOwned: jest
        .fn()
        .mockResolvedValue(options.enrollment ?? buildEnrollment({ status: EnrollmentStatus.PENDING_PAYMENT })),
    } as unknown as GetEnrollmentUseCase;
    const payments = {
      listAvailableMethods: jest.fn().mockResolvedValue(["CARD"]),
      initiatePayment: jest.fn().mockResolvedValue({
        paymentId: "p1",
        checkout: { providerReference: "ref", isAsync: true, ...(options.checkoutUrl ? { checkoutUrl: options.checkoutUrl } : {}) },
      }),
    } as unknown as PaymentsFacade;
    const users = {
      findById: jest.fn().mockResolvedValue(options.user === undefined ? { email: "a@ex.com" } : options.user),
    } as unknown as UsersFacade;
    const tenants = {
      findById: jest.fn().mockResolvedValue(options.tenant === undefined ? { slug: "acme" } : options.tenant),
    } as unknown as TenantsFacade;
    return { useCase: new InitiateEnrollmentPaymentUseCase(getEnrollment, payments, users, tenants), payments };
  }
  const args = { enrollmentId: "enr-1", userId: "user-1", tenantId: "t1", method: "CARD" as const };

  it("refuse une inscription gratuite (prix nul) même en attente de paiement", async () => {
    const { useCase, payments } = build({ enrollment: buildEnrollment({ status: EnrollmentStatus.PENDING_PAYMENT, pricePaid: 0 }) });
    await expect(useCase.execute(args)).rejects.toBeInstanceOf(EnrollmentNotPayableError);
    expect(payments.initiatePayment).not.toHaveBeenCalled();
  });

  it("lève NotFound si le compte ou l'entreprise est introuvable", async () => {
    await expect(build({ user: null }).useCase.execute(args)).rejects.toBeInstanceOf(NotFoundDomainError);
    await expect(build({ tenant: null }).useCase.execute(args)).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("renvoie checkoutUrl null pour un paiement asynchrone sans URL", async () => {
    const { useCase } = build({});
    await expect(useCase.execute(args)).resolves.toEqual({
      paymentId: "p1",
      checkoutUrl: null,
      providerReference: "ref",
      isAsync: true,
    });
  });
});

describe("GetLearnerLessonUseCase - traduction et ressources (PUB-17)", () => {
  const rawLesson = {
    id: "l1",
    moduleId: "m1",
    title: "Titre fr",
    order: 1,
    resourceType: "VIDEO",
    isMandatory: true,
    completionCriteria: null,
    downloadAllowed: false,
    contentHtml: "<p>fr</p>",
    storageUrl: null as string | null,
  };
  const MEDIA_ID = "123e4567-e89b-42d3-a456-426614174000";

  function build(options: {
    lesson?: Partial<typeof rawLesson>;
    appliedLocale?: string | null;
    translated?: { title: string | null; contentHtml: string | null } | null;
    playback?: () => Promise<unknown>;
    progress?: ReturnType<typeof buildProgress> | null;
  }) {
    const getEnrollment = { executeOwned: jest.fn().mockResolvedValue(buildEnrollment()) } as unknown as GetEnrollmentUseCase;
    const courses = {
      findByIdInTenant: jest.fn().mockResolvedValue({ progressionMode: "FREE", sourceLocale: "fr" }),
    } as unknown as CoursesFacade;
    const content = {
      findLessonInCourse: jest.fn().mockResolvedValue({ ...rawLesson, ...options.lesson }),
      findPublishedLessonLocale: jest.fn().mockResolvedValue(options.translated ?? null),
    } as unknown as CourseContentFacade;
    const access = {
      execute: jest.fn().mockResolvedValue([{ moduleId: "m1", accessible: true }]),
    } as unknown as GetAccessibleModulesUseCase;
    const media = {
      getPlaybackUrl: jest.fn().mockImplementation(options.playback ?? (() => Promise.resolve({ url: "https://signed", expiresAt: new Date("2030-01-01") }))),
    } as unknown as MediaFacade;
    const progress = {
      findByEnrollmentAndLesson: jest.fn().mockResolvedValue(options.progress ?? null),
    } as unknown as ProgressRepositoryPort;
    const locale = {
      execute: jest.fn().mockResolvedValue(options.appliedLocale ?? null),
    } as unknown as ResolveLearnerContentLocaleUseCase;
    return { useCase: new GetLearnerLessonUseCase(getEnrollment, courses, content, access, media, progress, locale), content, media, locale };
  }

  it("garde la langue d'origine quand aucune langue n'est demandée", async () => {
    const { useCase, locale } = build({});
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1");
    expect(locale.execute).not.toHaveBeenCalled();
    expect(view).toMatchObject({ title: "Titre fr", contentHtml: "<p>fr</p>", contentLocale: "fr", resource: null, progress: null });
  });

  it("garde la langue d'origine quand la langue demandée n'est pas lisible", async () => {
    const { useCase, content } = build({ appliedLocale: null });
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1", "en");
    expect(content.findPublishedLessonLocale).not.toHaveBeenCalled();
    expect(view.contentLocale).toBe("fr");
    expect(view.title).toBe("Titre fr");
  });

  it("renvoie la traduction publiée de la leçon", async () => {
    const { useCase, content } = build({ appliedLocale: "en", translated: { title: "Title en", contentHtml: "<p>en</p>" } });
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1", "en");
    expect(content.findPublishedLessonLocale).toHaveBeenCalledWith("l1", "en");
    expect(view).toMatchObject({ title: "Title en", contentHtml: "<p>en</p>", contentLocale: "en" });
  });

  it("retombe sur la langue d'origine si la leçon n'a pas de traduction publiée", async () => {
    const { useCase } = build({ appliedLocale: "en", translated: null });
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1", "en");
    expect(view).toMatchObject({ title: "Titre fr", contentLocale: "fr" });
  });

  it("renvoie une ressource externe brute, sans expiration", async () => {
    const { useCase, media } = build({ lesson: { storageUrl: "https://exemple.org/doc" } });
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1");
    expect(view.resource).toEqual({ kind: "EXTERNAL", url: "https://exemple.org/doc", expiresAt: null });
    expect(media.getPlaybackUrl).not.toHaveBeenCalled();
  });

  it("signe l'URL d'un média du tenant", async () => {
    const { useCase, media } = build({ lesson: { storageUrl: MEDIA_ID } });
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1");
    expect(media.getPlaybackUrl).toHaveBeenCalledWith(MEDIA_ID, "t1");
    expect(view.resource).toEqual({ kind: "MEDIA", url: "https://signed", expiresAt: new Date("2030-01-01") });
  });

  it("dégrade sans média quand celui-ci est inconnu du tenant", async () => {
    const { useCase } = build({
      lesson: { storageUrl: MEDIA_ID },
      playback: () => Promise.reject(new NotFoundDomainError("média")),
    });
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1");
    expect(view.resource).toBeNull();
  });

  it("propage les autres erreurs du média (ex. média non prêt)", async () => {
    const boom = new Error("MEDIA_NON_PRET");
    const { useCase } = build({ lesson: { storageUrl: MEDIA_ID }, playback: () => Promise.reject(boom) });
    await expect(useCase.execute("enr-1", "l1", "user-1", "t1")).rejects.toBe(boom);
  });

  it("inclut l'état de progression existant de l'apprenant", async () => {
    const { useCase } = build({ progress: buildProgress({ lessonId: "l1", opened: true, watchedPercent: 30, state: "IN_PROGRESS" as never }) });
    const view = await useCase.execute("enr-1", "l1", "user-1", "t1");
    expect(view.progress).toEqual({ state: "IN_PROGRESS", watchedPercent: 30, opened: true });
  });
});
