import { InvalidStateTransitionError } from "@shared/errors";

import { EnrollmentStatus } from "./enrollment-status";
import { Enrollment, type EnrollmentProps } from "./enrollment.entity";

function buildEnrollment(overrides: Partial<EnrollmentProps> = {}): Enrollment {
  const props: EnrollmentProps = {
    id: "enr-1",
    userId: "user-1",
    courseId: "course-1",
    status: EnrollmentStatus.PENDING_PAYMENT,
    pricePaid: 10000,
    currency: "XOF",
    locale: "fr",
    startedAt: null,
    expiresAt: null,
    completedAt: null,
    ...overrides,
  };
  return Enrollment.fromPersistence(props);
}

describe("Enrollment", () => {
  describe("activate (RG-06)", () => {
    it("active une inscription en attente de paiement et fixe startedAt", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.PENDING_PAYMENT });
      enrollment.activate(null);
      expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
      expect(enrollment.toSnapshot().startedAt).not.toBeNull();
      expect(enrollment.expiresAt).toBeNull();
    });

    it("calcule expiresAt à partir de accessDurationDays", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.PENDING_VALIDATION });
      enrollment.activate(30);
      const snapshot = enrollment.toSnapshot();
      expect(snapshot.expiresAt).not.toBeNull();
      const diffDays = Math.round(
        (snapshot.expiresAt?.getTime() ?? 0) - (snapshot.startedAt?.getTime() ?? 0),
      ) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(30);
    });

    it("rejette l'activation depuis un état terminal", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.COMPLETED });
      expect(() => enrollment.activate(null)).toThrow(InvalidStateTransitionError);
    });
  });

  describe("transitions", () => {
    it("permet ACTIVE -> SUSPENDED -> ACTIVE", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE });
      enrollment.suspend();
      expect(enrollment.status).toBe(EnrollmentStatus.SUSPENDED);
      enrollment.reactivate();
      expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it("rejette une transition non autorisée (REFUSED -> ACTIVE)", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.REFUSED });
      expect(() => enrollment.reactivate()).toThrow(InvalidStateTransitionError);
    });

    it("complete() fixe completedAt", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE });
      enrollment.complete();
      expect(enrollment.status).toBe(EnrollmentStatus.COMPLETED);
      expect(enrollment.toSnapshot().completedAt).not.toBeNull();
    });
  });

  describe("hasContentAccess (RG-17)", () => {
    it("retourne false si le statut ne donne pas accès (PENDING_PAYMENT)", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.PENDING_PAYMENT });
      expect(enrollment.hasContentAccess()).toBe(false);
    });

    it("retourne true pour ACTIVE sans date d'expiration", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE, expiresAt: null });
      expect(enrollment.hasContentAccess()).toBe(true);
    });

    it("retourne false si la date d'expiration est dépassée", () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE, expiresAt: past });
      expect(enrollment.hasContentAccess()).toBe(false);
    });

    it("retourne true si la date d'expiration n'est pas encore atteinte", () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE, expiresAt: future });
      expect(enrollment.hasContentAccess()).toBe(true);
    });

    it("retourne false pour une formation complétée mais expirée (accès contenu perdu)", () => {
      const past = new Date(Date.now() - 1000);
      const enrollment = buildEnrollment({ status: EnrollmentStatus.COMPLETED, expiresAt: past });
      expect(enrollment.hasContentAccess()).toBe(false);
    });
  });

  describe("hasCertificateAccess (RG-17)", () => {
    it("retourne true uniquement si COMPLETED, même après expiration du contenu", () => {
      const past = new Date(Date.now() - 1000);
      const enrollment = buildEnrollment({ status: EnrollmentStatus.COMPLETED, expiresAt: past });
      expect(enrollment.hasCertificateAccess()).toBe(true);
    });

    it("retourne false pour ACTIVE", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE });
      expect(enrollment.hasCertificateAccess()).toBe(false);
    });
  });

  describe("extendAccess (ENT-64)", () => {
    it("prolonge à partir d'expiresAt existant", () => {
      const base = new Date("2026-01-01T00:00:00Z");
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE, expiresAt: base });
      enrollment.extendAccess(10);
      const expected = new Date(base);
      expected.setDate(expected.getDate() + 10);
      expect(enrollment.expiresAt?.getTime()).toBe(expected.getTime());
    });

    it("prolonge à partir d'aujourd'hui si pas de date d'expiration", () => {
      const enrollment = buildEnrollment({ status: EnrollmentStatus.ACTIVE, expiresAt: null });
      enrollment.extendAccess(5);
      expect(enrollment.expiresAt).not.toBeNull();
    });
  });
});

describe("Enrollment accessors and manual/offline traces", () => {
  it("expose les propriétés persistées", () => {
    const startedAt = new Date("2026-01-01T00:00:00Z");
    const enrollment = buildEnrollment({ startedAt, completedAt: null, expiresAt: null });
    expect(enrollment.id).toBe("enr-1");
    expect(enrollment.userId).toBe("user-1");
    expect(enrollment.courseId).toBe("course-1");
    expect(enrollment.pricePaid).toBe(10000);
    expect(enrollment.currency).toBe("XOF");
    expect(enrollment.startedAt).toBe(startedAt);
    expect(enrollment.completedAt).toBeNull();
    expect(enrollment.refusalReason).toBeNull();
    expect(enrollment.manualEnrollmentNote).toBeNull();
  });

  it("recordOfflinePayment conserve référence et montant déclaré", () => {
    const enrollment = buildEnrollment({ status: EnrollmentStatus.PENDING_VALIDATION });
    enrollment.recordOfflinePayment("VIR-1", 5000);
    expect(enrollment.toSnapshot()).toMatchObject({ offlinePaymentReference: "VIR-1", offlinePaymentAmount: 5000 });
  });

  it("recordManualEnrollment trace le motif normalisé et le gestionnaire", () => {
    const enrollment = buildEnrollment();
    enrollment.recordManualEnrollment("  Geste commercial  ", "admin-1");
    expect(enrollment.manualEnrollmentNote).toBe("Geste commercial");
    expect(enrollment.toSnapshot().enrolledByUserId).toBe("admin-1");
  });

  it("refuse une inscription en attente avec un motif, expire une inscription active", () => {
    const pending = buildEnrollment({ status: EnrollmentStatus.PENDING_VALIDATION });
    pending.refuse("Paiement non reçu");
    expect(pending.status).toBe(EnrollmentStatus.REFUSED);
    expect(pending.refusalReason).toBe("Paiement non reçu");

    const active = buildEnrollment({ status: EnrollmentStatus.ACTIVE });
    active.expire();
    expect(active.status).toBe(EnrollmentStatus.EXPIRED);
  });

  it("réactive depuis SUSPENDED et rejette expire() depuis un état non actif", () => {
    const suspended = buildEnrollment({ status: EnrollmentStatus.SUSPENDED });
    suspended.reactivate();
    expect(suspended.status).toBe(EnrollmentStatus.ACTIVE);
    expect(() => buildEnrollment({ status: EnrollmentStatus.PENDING_PAYMENT }).expire()).toThrow(
      InvalidStateTransitionError,
    );
  });
});
