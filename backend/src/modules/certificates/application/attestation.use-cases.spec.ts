import { NotFoundDomainError } from "@shared/errors";

import { AttestationRevokedEvent } from "../certificates.events";
import { AttestationStatus } from "../domain/attestation-status";
import { Attestation } from "../domain/attestation.entity";

import {
  GetAttestationDownloadUrlUseCase,
  ListAttestationsUseCase,
  RevokeAttestationUseCase,
  VerifyAttestationUseCase,
} from "./attestation.use-cases";
import { IssueAttestationUseCase } from "./issue-attestation.use-case";

function attestation(status = AttestationStatus.VALID): Attestation {
  return Attestation.fromPersistence({
    id: "att-1",
    enrollmentId: "enr-1",
    number: "ATT-202601-ABCD1234",
    status,
    learnerNameSnapshot: "Aïcha Koné",
    courseTitleSnapshot: "Initiation à Excel",
    progressPercent: 100,
    durationMinutes: null,
    startedAt: null,
    endedAt: null,
    pdfUrl: "key",
    qrVerificationUrl: "url",
    revocationReason: null,
    issuedAt: new Date("2026-01-15T00:00:00Z"),
    revokedAt: null,
  });
}

function buildIssue(
  courseType: string,
  existing: Attestation | null = null,
  overrides: { learner?: unknown; progress?: unknown; completedAt?: Date | null } = {},
) {
  const repository = {
    findByEnrollmentId: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue({ id: "att-new" }),
  };
  const renderer = { render: jest.fn().mockResolvedValue(Buffer.from("pdf")) };
  const storage = { uploadPdf: jest.fn().mockResolvedValue("tenants/t1/certificates/x.pdf") };
  const courses = {
    findById: jest.fn().mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      title: "Initiation à Excel",
      type: courseType,
      estimatedDurationMinutes: 90,
    }),
  };
  const users = {
    findById: jest.fn().mockResolvedValue("learner" in overrides ? overrides.learner : { fullName: "Aïcha Koné" }),
  };
  const tenants = { findById: jest.fn().mockResolvedValue({ slug: "acme" }) };
  const enrollments = {
    findById: jest.fn().mockResolvedValue({
      toSnapshot: () => ({
        startedAt: new Date("2026-01-01T00:00:00Z"),
        completedAt: "completedAt" in overrides ? overrides.completedAt : new Date("2026-01-10T00:00:00Z"),
        locale: "fr",
      }),
    }),
    getProgressSummary: jest.fn().mockResolvedValue(overrides.progress ?? { completedLessons: 4, totalLessons: 5 }),
  };
  const emitter = { emit: jest.fn() };
  const useCase = new IssueAttestationUseCase(
    repository as never,
    renderer as never,
    storage as never,
    courses as never,
    users as never,
    tenants as never,
    enrollments as never,
    emitter as never,
  );
  return { useCase, repository, renderer, storage, emitter };
}

const event = { enrollmentId: "enr-1", userId: "u1", courseId: "c1" };

describe("IssueAttestationUseCase (ENT-44)", () => {
  it("délivre une attestation avec valeurs figées pour une formation non certifiante", async () => {
    const { useCase, repository, renderer, emitter } = buildIssue("NON_CERTIFYING");
    await useCase.execute(event);

    expect(renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ learnerName: "Aïcha Koné", courseTitle: "Initiation à Excel", progressPercent: 80 }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        enrollmentId: "enr-1",
        learnerNameSnapshot: "Aïcha Koné",
        courseTitleSnapshot: "Initiation à Excel",
        progressPercent: 80,
        number: expect.stringMatching(/^ATT-\d{6}-[A-Z0-9_-]{8}$/),
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      "attestation.issued",
      expect.objectContaining({ attestationId: "att-new" }),
    );
  });

  it("ne délivre rien si la formation est certifiante (le certificat s'applique)", async () => {
    const { useCase, repository, emitter } = buildIssue("CERTIFYING");
    await useCase.execute(event);
    expect(repository.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("est idempotent : aucune seconde attestation pour la même inscription", async () => {
    const { useCase, repository, renderer, emitter } = buildIssue("NON_CERTIFYING", attestation());
    await useCase.execute(event);
    expect(renderer.render).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("ignore une collision d'unicité concurrente sans notifier", async () => {
    const { useCase, repository, emitter } = buildIssue("NON_CERTIFYING");
    repository.create.mockRejectedValue({ code: "P2002" });
    await expect(useCase.execute(event)).resolves.toBeUndefined();
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});

describe("RevokeAttestationUseCase", () => {
  it("révoque via la recherche par tenant et émet l'événement d'audit", async () => {
    const found = attestation();
    const repository = { findByIdInTenant: jest.fn().mockResolvedValue(found), save: jest.fn() };
    const emitter = { emit: jest.fn() };
    await new RevokeAttestationUseCase(repository as never, emitter as never).execute("att-1", "t1", "Erreur", "u9");

    expect(repository.findByIdInTenant).toHaveBeenCalledWith("att-1", "t1");
    expect(found.status).toBe(AttestationStatus.REVOKED);
    expect(repository.save).toHaveBeenCalledWith(found);
    expect(emitter.emit).toHaveBeenCalledWith(
      "attestation.revoked",
      new AttestationRevokedEvent("att-1", "t1", "u9", "Erreur"),
    );
  });

  it("lève NotFound pour une attestation d'un autre tenant", async () => {
    const repository = { findByIdInTenant: jest.fn().mockResolvedValue(null), save: jest.fn() };
    await expect(
      new RevokeAttestationUseCase(repository as never, { emit: jest.fn() } as never).execute("att-1", "t1", "x", null),
    ).rejects.toThrow(NotFoundDomainError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe("VerifyAttestationUseCase", () => {
  it("valide une attestation VALIDE et invalide une révoquée ou inconnue", async () => {
    const repository = { findByNumber: jest.fn() };
    const useCase = new VerifyAttestationUseCase(repository as never);

    repository.findByNumber.mockResolvedValueOnce(attestation());
    expect(await useCase.execute("att-202601-abcd1234")).toMatchObject({ valid: true, type: "ATTESTATION" });
    expect(repository.findByNumber).toHaveBeenCalledWith("ATT-202601-ABCD1234");

    repository.findByNumber.mockResolvedValueOnce(attestation(AttestationStatus.REVOKED));
    expect(await useCase.execute("ATT-202601-ABCD1234")).toMatchObject({ valid: false, status: "REVOKED" });

    repository.findByNumber.mockResolvedValueOnce(null);
    expect(await useCase.execute("ATT-X")).toEqual({ valid: false, type: "ATTESTATION" });
  });
});

describe("ListAttestationsUseCase", () => {
  it("délègue aux recherches par tenant, par apprenant et par inscription", async () => {
    const list = [attestation()];
    const repository = {
      listByTenant: jest.fn().mockResolvedValue(list),
      listByUser: jest.fn().mockResolvedValue(list),
      findByEnrollmentId: jest.fn().mockResolvedValue(list[0]),
    };
    const useCase = new ListAttestationsUseCase(repository as never);
    await expect(useCase.listForTenant("t1")).resolves.toBe(list);
    await expect(useCase.listForLearner("u1", "t1")).resolves.toBe(list);
    await expect(useCase.findByEnrollmentId("enr-1")).resolves.toBe(list[0]);
    expect(repository.listByTenant).toHaveBeenCalledWith("t1");
    expect(repository.listByUser).toHaveBeenCalledWith("u1", "t1");
    expect(repository.findByEnrollmentId).toHaveBeenCalledWith("enr-1");
  });
});

describe("GetAttestationDownloadUrlUseCase", () => {
  function setup(findByIdInTenant: unknown, findById: unknown) {
    const repository = {
      findByIdInTenant: jest.fn().mockResolvedValue(findByIdInTenant),
      findById: jest.fn().mockResolvedValue(findById),
    };
    const storage = { createSignedDownloadUrl: jest.fn().mockResolvedValue("https://signed") };
    const enrollments = { findOwnedByUser: jest.fn().mockResolvedValue({}) };
    return {
      repository,
      storage,
      enrollments,
      useCase: new GetAttestationDownloadUrlUseCase(repository as never, storage as never, enrollments as never),
    };
  }

  it("vue entreprise : signe l'URL de l'attestation du tenant pendant 5 minutes", async () => {
    const { useCase, storage, repository } = setup(attestation(), null);
    await expect(useCase.executeForTenant("att-1", "t1")).resolves.toBe("https://signed");
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("att-1", "t1");
    expect(storage.createSignedDownloadUrl).toHaveBeenCalledWith("key", 300);
  });

  it("vue entreprise : NotFound pour une attestation d'un autre tenant", async () => {
    const { useCase, storage } = setup(null, null);
    await expect(useCase.executeForTenant("att-1", "t1")).rejects.toThrow(NotFoundDomainError);
    expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("vue apprenant : vérifie la propriété de l'inscription avant de signer", async () => {
    const { useCase, enrollments, storage } = setup(null, attestation());
    await expect(useCase.executeForLearner("att-1", "u1", "t1")).resolves.toBe("https://signed");
    expect(enrollments.findOwnedByUser).toHaveBeenCalledWith("enr-1", "u1", "t1");
    expect(storage.createSignedDownloadUrl).toHaveBeenCalled();
  });

  it("vue apprenant : ne signe rien si l'inscription n'appartient pas à l'apprenant", async () => {
    const { useCase, enrollments, storage } = setup(null, attestation());
    enrollments.findOwnedByUser.mockRejectedValue(new NotFoundDomainError("autre"));
    await expect(useCase.executeForLearner("att-1", "u2", "t1")).rejects.toThrow(NotFoundDomainError);
    expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("vue apprenant : NotFound si l'attestation n'existe pas", async () => {
    const { useCase, enrollments } = setup(null, null);
    await expect(useCase.executeForLearner("att-1", "u1", "t1")).rejects.toThrow(NotFoundDomainError);
    expect(enrollments.findOwnedByUser).not.toHaveBeenCalled();
  });

  it("usage interne : signe sans contrôle de propriété, NotFound si inconnue", async () => {
    const found = setup(null, attestation());
    await expect(found.useCase.executeInternal("att-1")).resolves.toBe("https://signed");
    expect(found.enrollments.findOwnedByUser).not.toHaveBeenCalled();
    const missing = setup(null, null);
    await expect(missing.useCase.executeInternal("att-1")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("IssueAttestationUseCase — cas limites", () => {
  it("handle absorbe une erreur de génération sans la propager", async () => {
    const { useCase, renderer, emitter } = buildIssue("NON_CERTIFYING");
    renderer.render.mockRejectedValue(new Error("pdf KO"));
    await expect(useCase.handle(event)).resolves.toBeUndefined();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("handle délègue à execute en cas de succès", async () => {
    const { useCase, emitter } = buildIssue("NON_CERTIFYING");
    await useCase.handle(event);
    expect(emitter.emit).toHaveBeenCalledWith(
      "attestation.issued",
      expect.objectContaining({ attestationId: "att-new" }),
    );
  });

  it("propage une erreur de création qui n'est pas une collision d'unicité", async () => {
    const { useCase, repository, emitter } = buildIssue("NON_CERTIFYING");
    repository.create.mockRejectedValue(new Error("db down"));
    await expect(useCase.execute(event)).rejects.toThrow("db down");
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("n'émet rien si l'apprenant est introuvable", async () => {
    const { useCase, repository, renderer } = buildIssue("NON_CERTIFYING", null, { learner: null });
    await useCase.execute(event);
    expect(renderer.render).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("progression 100 % sans leçon, fin = date de délivrance sans complétion, domaine par défaut", async () => {
    const original = process.env.APP_BASE_DOMAIN;
    delete process.env.APP_BASE_DOMAIN;
    try {
      const { useCase, repository, renderer } = buildIssue("NON_CERTIFYING", null, {
        progress: { completedLessons: 0, totalLessons: 0 },
        completedAt: null,
      });
      await useCase.execute(event);
      const data = renderer.render.mock.calls[0][0];
      expect(data.progressPercent).toBe(100);
      expect(data.endedAt).toBe(data.issuedAt);
      expect(data.qrVerificationUrl).toContain("acme.votredomaine.local");
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ progressPercent: 100 }));
    } finally {
      if (original !== undefined) process.env.APP_BASE_DOMAIN = original;
    }
  });
});
