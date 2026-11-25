import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { MediaFacade } from "@modules/media/media.facade";
import type { PaymentsFacade } from "@modules/payments/payments.facade";
import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import type { UsersFacade } from "@modules/users/users.facade";
import { NotFoundDomainError } from "@shared/errors";

import { EnrollmentStatus } from "../domain/enrollment-status";
import { Enrollment } from "../domain/enrollment.entity";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import type { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import type { GetEnrollmentUseCase } from "./get-enrollment.use-case";
import { GetLearnerLessonUseCase } from "./get-learner-lesson.use-case";
import {
  EnrollmentNotPayableError,
  InitiateEnrollmentPaymentUseCase,
  PaymentMethodUnavailableError,
} from "./initiate-enrollment-payment.use-case";
import type { ResolveLearnerContentLocaleUseCase } from "./learner-content-locale.use-cases";
import { ModuleLockedError } from "./learner-lesson-access";

function enrollment(overrides: Partial<Parameters<typeof Enrollment.fromPersistence>[0]> = {}): Enrollment {
  return Enrollment.fromPersistence({
    id: "e-1",
    userId: "u-1",
    courseId: "c-1",
    status: EnrollmentStatus.ACTIVE,
    pricePaid: 25000,
    currency: "XOF",
    locale: "fr",
    startedAt: null,
    expiresAt: null,
    completedAt: null,
    ...overrides,
  });
}

describe("GetLearnerLessonUseCase", () => {
  function build(options: { lessonFound?: boolean; accessible?: boolean; enrollment?: Enrollment }) {
    const getEnrollment = {
      executeOwned: jest.fn().mockResolvedValue(options.enrollment ?? enrollment()),
    } as unknown as GetEnrollmentUseCase;
    const lesson = { id: "l-1", moduleId: "m-1", resourceType: "TEXT", storageUrl: null, title: "T" };
    const content = {
      findLessonInCourse: jest.fn().mockResolvedValue(options.lessonFound === false ? null : lesson),
    } as unknown as CourseContentFacade;
    const courses = {
      findByIdInTenant: jest.fn().mockResolvedValue({ progressionMode: "SEQUENTIAL" }),
    } as unknown as CoursesFacade;
    const accessible = {
      execute: jest.fn().mockResolvedValue([{ moduleId: "m-1", accessible: options.accessible ?? true }]),
    } as unknown as GetAccessibleModulesUseCase;
    const progress = { findByEnrollmentAndLesson: jest.fn().mockResolvedValue(null) } as unknown as ProgressRepositoryPort;
    const useCase = new GetLearnerLessonUseCase(getEnrollment, courses, content, accessible, {} as MediaFacade, progress, {} as ResolveLearnerContentLocaleUseCase);
    return { useCase, content };
  }

  it("leçon d'une autre formation (ou inconnue): 404 uniforme, jamais d'erreur FK", async () => {
    const { useCase, content } = build({ lessonFound: false });
    await expect(useCase.authorize("e-1", "l-x", "u-1", "t-1", false)).rejects.toThrow(NotFoundDomainError);
    expect(content.findLessonInCourse).toHaveBeenCalledWith("l-x", "c-1");
  });

  it("module verrouillé (RG-09): MODULE_VERROUILLE", async () => {
    const { useCase } = build({ accessible: false });
    await expect(useCase.authorize("e-1", "l-1", "u-1", "t-1", false)).rejects.toThrow(ModuleLockedError);
  });

  it("lecture de contenu sans accès actif (suspendu / expiré): 404", async () => {
    const suspended = build({ enrollment: enrollment({ status: EnrollmentStatus.SUSPENDED }) });
    await expect(suspended.useCase.execute("e-1", "l-1", "u-1", "t-1")).rejects.toThrow(NotFoundDomainError);
    const expired = build({ enrollment: enrollment({ expiresAt: new Date(Date.now() - 1000) }) });
    await expect(expired.useCase.execute("e-1", "l-1", "u-1", "t-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("leçon TEXT accessible: renvoie le HTML déjà assaini tel quel, sans ressource", async () => {
    const { useCase, content } = build({});
    (content.findLessonInCourse as jest.Mock).mockResolvedValue({
      id: "l-1",
      moduleId: "m-1",
      title: "T",
      order: 0,
      resourceType: "TEXT",
      isMandatory: true,
      completionCriteria: null,
      downloadAllowed: false,
      contentHtml: "<p>ok</p>",
      storageUrl: null,
    });
    const view = await useCase.execute("e-1", "l-1", "u-1", "t-1");
    expect(view.contentHtml).toBe("<p>ok</p>");
    expect(view.resource).toBeNull();
  });
});

describe("InitiateEnrollmentPaymentUseCase", () => {
  function build(options: { enrollment?: Enrollment; methods?: string[] } = {}) {
    const getEnrollment = {
      executeOwned: jest.fn().mockResolvedValue(options.enrollment ?? enrollment({ status: EnrollmentStatus.PENDING_PAYMENT })),
    } as unknown as GetEnrollmentUseCase;
    const payments = {
      listAvailableMethods: jest.fn().mockResolvedValue(options.methods ?? ["CARD"]),
      initiatePayment: jest.fn().mockResolvedValue({
        paymentId: "p-1",
        checkout: { checkoutUrl: "https://pay/x", providerReference: "ref", isAsync: false },
      }),
    } as unknown as PaymentsFacade;
    const users = { findById: jest.fn().mockResolvedValue({ email: "learner@x.co" }) } as unknown as UsersFacade;
    const tenants = { findById: jest.fn().mockResolvedValue({ slug: "acme" }) } as unknown as TenantsFacade;
    return { payments, useCase: new InitiateEnrollmentPaymentUseCase(getEnrollment, payments, users, tenants) };
  }

  it("utilise le prix et la devise figés de l'inscription, l'e-mail du compte et un callback serveur", async () => {
    const { useCase, payments } = build();
    const result = await useCase.execute({ enrollmentId: "e-1", userId: "u-1", tenantId: "t-1", method: "CARD" });
    expect(payments.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t-1",
        type: "COURSE_ENROLLMENT",
        method: "CARD",
        amount: 25000,
        currency: "XOF",
        enrollmentId: "e-1",
        customerEmail: "learner@x.co",
        callbackUrl: expect.stringContaining("acme."),
      }),
    );
    expect(result).toEqual({ paymentId: "p-1", checkoutUrl: "https://pay/x", providerReference: "ref", isAsync: false });
  });

  it.each([EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING_VALIDATION, EnrollmentStatus.SUSPENDED])(
    "refuse une inscription au statut %s",
    async (status) => {
      const { useCase, payments } = build({ enrollment: enrollment({ status }) });
      await expect(
        useCase.execute({ enrollmentId: "e-1", userId: "u-1", tenantId: "t-1", method: "CARD" }),
      ).rejects.toThrow(EnrollmentNotPayableError);
      expect(payments.initiatePayment).not.toHaveBeenCalled();
    },
  );

  it("refuse un moyen de paiement non proposé par un fournisseur actif (erreur claire, pas de 500)", async () => {
    const { useCase, payments } = build({ methods: [] });
    await expect(
      useCase.execute({ enrollmentId: "e-1", userId: "u-1", tenantId: "t-1", method: "CARD" }),
    ).rejects.toThrow(PaymentMethodUnavailableError);
    expect(payments.initiatePayment).not.toHaveBeenCalled();
  });
});
