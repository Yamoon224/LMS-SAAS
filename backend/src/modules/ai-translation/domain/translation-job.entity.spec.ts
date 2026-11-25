import { InvalidStateTransitionError } from "@shared/errors";

import { TranslationJobStatus } from "./translation-job-status";
import { TranslationJob, type TranslationJobProps } from "./translation-job.entity";

function buildJob(overrides: Partial<TranslationJobProps> = {}): TranslationJob {
  const props: TranslationJobProps = {
    id: "job-1",
    tenantId: "tenant-1",
    courseId: "course-1",
    targetLocale: "en",
    wordCount: 500,
    estimatedCredits: 50,
    debitedCredits: null,
    status: TranslationJobStatus.ESTIMATED,
    errorMessage: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    completedAt: null,
    ...overrides,
  };
  return TranslationJob.fromPersistence(props);
}

describe("TranslationJob", () => {
  it("expose ses propriétés", () => {
    const job = buildJob();
    expect(job.id).toBe("job-1");
    expect(job.tenantId).toBe("tenant-1");
    expect(job.courseId).toBe("course-1");
    expect(job.targetLocale).toBe("en");
    expect(job.estimatedCredits).toBe(50);
    expect(job.debitedCredits).toBeNull();
    expect(job.status).toBe(TranslationJobStatus.ESTIMATED);
  });

  describe("confirm (ADM-18)", () => {
    it("passe de ESTIMATED à CONFIRMED et fixe les crédits débités", () => {
      const job = buildJob({ status: TranslationJobStatus.ESTIMATED });
      job.confirm(50);
      expect(job.status).toBe(TranslationJobStatus.CONFIRMED);
      expect(job.debitedCredits).toBe(50);
    });

    it("rejette la confirmation d'un job déjà confirmé", () => {
      const job = buildJob({ status: TranslationJobStatus.CONFIRMED });
      expect(() => job.confirm(50)).toThrow(InvalidStateTransitionError);
    });
  });

  describe("start/complete/fail", () => {
    it("suit CONFIRMED -> IN_PROGRESS -> COMPLETED et fixe completedAt", () => {
      const job = buildJob({ status: TranslationJobStatus.CONFIRMED });
      job.start();
      expect(job.status).toBe(TranslationJobStatus.IN_PROGRESS);
      job.complete();
      expect(job.status).toBe(TranslationJobStatus.COMPLETED);
      expect(job.toSnapshot().completedAt).not.toBeNull();
    });

    it("suit CONFIRMED -> IN_PROGRESS -> FAILED et fixe le message d'erreur", () => {
      const job = buildJob({ status: TranslationJobStatus.CONFIRMED });
      job.start();
      job.fail("Fournisseur indisponible");
      expect(job.status).toBe(TranslationJobStatus.FAILED);
      expect(job.toSnapshot().errorMessage).toBe("Fournisseur indisponible");
    });

    it("rejette le démarrage direct depuis ESTIMATED (sans confirmation)", () => {
      const job = buildJob({ status: TranslationJobStatus.ESTIMATED });
      expect(() => job.start()).toThrow(InvalidStateTransitionError);
    });

    it("rejette toute transition depuis un état terminal (COMPLETED)", () => {
      const job = buildJob({ status: TranslationJobStatus.COMPLETED });
      expect(() => job.complete()).toThrow(InvalidStateTransitionError);
      expect(() => job.fail("x")).toThrow(InvalidStateTransitionError);
    });
  });
});
