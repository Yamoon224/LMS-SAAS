import type { CertificatesFacade } from "@modules/certificates/certificates.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";

import { NotificationChannel } from "../domain/notification-channel";

import { AttestationIssuedListener } from "./attestation-issued.listener";
import { CertificateIssuedListener } from "./certificate-issued.listener";
import { EnrollmentActivatedListener } from "./enrollment-activated.listener";
import { EnrollmentInactivityListener } from "./enrollment-inactivity.listener";
import { EnrollmentRefusedListener } from "./enrollment-refused.listener";
import { LiveSessionScheduledListener } from "./live-session-scheduled.listener";
import { NotifyUserUseCase } from "./notify-user.use-case";
import { RefundRequestDecidedListener } from "./refund-request-decided.listener";

describe("learner notification listeners", () => {
  let notify: { execute: jest.Mock };

  beforeEach(() => {
    notify = { execute: jest.fn().mockResolvedValue(undefined) };
  });

  const notifier = () => notify as unknown as NotifyUserUseCase;

  describe("EnrollmentActivatedListener", () => {
    it("confirms the enrollment in-app with the course title", async () => {
      const courses = { findById: jest.fn().mockResolvedValue({ title: "Maths" }) };
      const listener = new EnrollmentActivatedListener(notifier(), courses as unknown as CoursesFacade);

      await listener.handle({ userId: "u1", courseId: "c1" } as never);

      expect(courses.findById).toHaveBeenCalledWith("c1");
      expect(notify.execute).toHaveBeenCalledWith({
        userId: "u1",
        templateKey: "enrollment.activated",
        channel: NotificationChannel.IN_APP,
        payload: { courseTitle: "Maths" },
      });
    });

    it("propagates a failure to load the course without notifying", async () => {
      const courses = { findById: jest.fn().mockRejectedValue(new Error("not found")) };
      const listener = new EnrollmentActivatedListener(notifier(), courses as unknown as CoursesFacade);

      await expect(listener.handle({ userId: "u1", courseId: "c1" } as never)).rejects.toThrow("not found");
      expect(notify.execute).not.toHaveBeenCalled();
    });
  });

  describe("EnrollmentRefusedListener", () => {
    it("tells the learner the refusal reason in-app", async () => {
      const courses = { findById: jest.fn().mockResolvedValue({ title: "Maths" }) };
      const listener = new EnrollmentRefusedListener(notifier(), courses as unknown as CoursesFacade);

      await listener.handle({ userId: "u1", courseId: "c1", reason: "Preuve illisible" } as never);

      expect(notify.execute).toHaveBeenCalledWith({
        userId: "u1",
        templateKey: "enrollment.refused",
        channel: NotificationChannel.IN_APP,
        payload: { courseTitle: "Maths", reason: "Preuve illisible" },
      });
    });
  });

  describe("EnrollmentInactivityListener", () => {
    const event = { userId: "u1", courseId: "c1", enrollmentId: "e1", daysInactive: 14 } as never;

    it("sends the reminder both in-app and by e-mail", async () => {
      const courses = { findById: jest.fn().mockResolvedValue({ title: "Maths" }) };
      const listener = new EnrollmentInactivityListener(notifier(), courses as unknown as CoursesFacade);

      await listener.handle(event);

      const payload = { courseTitle: "Maths", daysInactive: 14 };
      expect(notify.execute).toHaveBeenCalledTimes(2);
      expect(notify.execute).toHaveBeenNthCalledWith(1, {
        userId: "u1",
        templateKey: "enrollment.inactivity-reminder",
        channel: NotificationChannel.IN_APP,
        payload,
      });
      expect(notify.execute).toHaveBeenNthCalledWith(2, {
        userId: "u1",
        templateKey: "enrollment.inactivity-reminder",
        channel: NotificationChannel.EMAIL,
        payload,
      });
    });

    it("swallows a failure so the scheduled run never breaks", async () => {
      const courses = { findById: jest.fn().mockRejectedValue(new Error("boom")) };
      const listener = new EnrollmentInactivityListener(notifier(), courses as unknown as CoursesFacade);

      await expect(listener.handle(event)).resolves.toBeUndefined();
      expect(notify.execute).not.toHaveBeenCalled();
    });

    it("stops after a failing channel without throwing", async () => {
      const courses = { findById: jest.fn().mockResolvedValue({ title: "Maths" }) };
      notify.execute.mockRejectedValueOnce(new Error("queue down"));
      const listener = new EnrollmentInactivityListener(notifier(), courses as unknown as CoursesFacade);

      await expect(listener.handle(event)).resolves.toBeUndefined();
      expect(notify.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe("LiveSessionScheduledListener", () => {
    const startAt = new Date("2026-05-01T09:30:00Z");
    const event = { courseId: "c1", title: "Q&A", startAt, meetLink: "https://meet/x" } as never;

    it("notifies only learners whose enrollment gives content access", async () => {
      const enrollments = {
        listForCourse: jest.fn().mockResolvedValue([
          { userId: "u1", hasContentAccess: () => true },
          { userId: "u2", hasContentAccess: () => false },
          { userId: "u3", hasContentAccess: () => true },
        ]),
      };
      const listener = new LiveSessionScheduledListener(notifier(), enrollments as unknown as EnrollmentsFacade);

      await listener.handle(event);

      expect(enrollments.listForCourse).toHaveBeenCalledWith("c1");
      expect(notify.execute).toHaveBeenCalledTimes(2);
      const payload = { sessionTitle: "Q&A", startAt: startAt.toLocaleString("fr-FR"), meetLink: "https://meet/x" };
      expect(notify.execute).toHaveBeenCalledWith({ userId: "u1", templateKey: "live-session.scheduled", payload });
      expect(notify.execute).toHaveBeenCalledWith({ userId: "u3", templateKey: "live-session.scheduled", payload });
    });

    it("sends nothing when nobody is enrolled", async () => {
      const enrollments = { listForCourse: jest.fn().mockResolvedValue([]) };
      const listener = new LiveSessionScheduledListener(notifier(), enrollments as unknown as EnrollmentsFacade);

      await listener.handle(event);

      expect(notify.execute).not.toHaveBeenCalled();
    });
  });

  describe("CertificateIssuedListener", () => {
    it("sends the certificate download link to the learner", async () => {
      const certificates = { getDownloadUrl: jest.fn().mockResolvedValue("https://dl/cert") };
      const listener = new CertificateIssuedListener(notifier(), certificates as unknown as CertificatesFacade);

      await listener.handle({ certificateId: "cert1", learnerUserId: "u1", courseTitle: "Maths" } as never);

      expect(certificates.getDownloadUrl).toHaveBeenCalledWith("cert1");
      expect(notify.execute).toHaveBeenCalledWith({
        userId: "u1",
        templateKey: "certificate.issued",
        payload: { courseTitle: "Maths", downloadUrl: "https://dl/cert" },
      });
    });
  });

  describe("AttestationIssuedListener", () => {
    it("sends the attestation download link to the learner", async () => {
      const certificates = { getAttestationDownloadUrl: jest.fn().mockResolvedValue("https://dl/att") };
      const listener = new AttestationIssuedListener(notifier(), certificates as unknown as CertificatesFacade);

      await listener.handle({ attestationId: "at1", learnerUserId: "u1", courseTitle: "Maths" } as never);

      expect(certificates.getAttestationDownloadUrl).toHaveBeenCalledWith("at1");
      expect(notify.execute).toHaveBeenCalledWith({
        userId: "u1",
        templateKey: "attestation.issued",
        payload: { courseTitle: "Maths", downloadUrl: "https://dl/att" },
      });
    });
  });

  describe("RefundRequestDecidedListener", () => {
    const base = { learnerUserId: "u1", courseTitle: "Maths", amount: 90, currency: "EUR", note: "ok" };

    it.each([
      ["ACCEPTED", "refund.accepted"],
      ["REJECTED", "refund.rejected"],
      ["REFUNDED", "refund.refunded"],
    ])("maps outcome %s to template %s", async (outcome, templateKey) => {
      await new RefundRequestDecidedListener(notifier()).handle({ ...base, outcome } as never);

      expect(notify.execute).toHaveBeenCalledWith({
        userId: "u1",
        templateKey,
        channel: NotificationChannel.IN_APP,
        payload: { courseTitle: "Maths", note: "ok", amount: 90, currency: "EUR" },
      });
    });

    it("uses an empty note when none is provided", async () => {
      await new RefundRequestDecidedListener(notifier()).handle({ ...base, note: null, outcome: "REJECTED" } as never);

      expect(notify.execute).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ note: "" }) }),
      );
    });

    it("ignores a decision without learner account", async () => {
      await new RefundRequestDecidedListener(notifier()).handle({
        ...base,
        learnerUserId: null,
        outcome: "ACCEPTED",
      } as never);

      expect(notify.execute).not.toHaveBeenCalled();
    });
  });
});
