import { NotFoundDomainError } from "@shared/errors";

import { DEFAULT_DESIGN, InvalidCertificateDesignError } from "../domain/certificate-design";
import { CertificateStatus } from "../domain/certificate-status";
import { CertificateTemplate } from "../domain/certificate-template.entity";
import { Certificate } from "../domain/certificate.entity";

import { CreateCertificateTemplateUseCase } from "./create-certificate-template.use-case";
import { GetCertificateDownloadUrlUseCase } from "./get-certificate-download-url.use-case";
import { GetCertificateUseCase } from "./get-certificate.use-case";
import { ListCertificateTemplatesUseCase } from "./list-certificate-templates.use-case";
import { ListCertificatesUseCase } from "./list-certificates.use-case";
import { VerifyCertificateUseCase } from "./verify-certificate.use-case";

const certificate = (status = CertificateStatus.VALID) =>
  Certificate.fromPersistence({
    id: "cert-1",
    enrollmentId: "enr-1",
    templateId: "tpl-1",
    number: "CERT-202601-ABCD1234",
    status,
    learnerNameSnapshot: "Aïcha Koné",
    courseTitleSnapshot: "Comptabilité",
    scorePercent: 90,
    pdfUrl: "key.pdf",
    qrVerificationUrl: "url",
    revocationReason: null,
    issuedAt: new Date("2026-01-15T00:00:00Z"),
    revokedAt: null,
  });

describe("GetCertificateUseCase", () => {
  it("retourne le certificat, ou lève NotFound", async () => {
    const found = certificate();
    const repository = { findById: jest.fn().mockResolvedValueOnce(found).mockResolvedValueOnce(null) };
    const useCase = new GetCertificateUseCase(repository as never);
    await expect(useCase.execute("cert-1")).resolves.toBe(found);
    await expect(useCase.execute("absent")).rejects.toThrow(NotFoundDomainError);
  });

  it("retrouve le certificat d'une inscription (RG-17), ou null", async () => {
    const found = certificate();
    const repository = { findByEnrollmentId: jest.fn().mockResolvedValueOnce(found).mockResolvedValueOnce(null) };
    const useCase = new GetCertificateUseCase(repository as never);
    await expect(useCase.executeForEnrollment("enr-1")).resolves.toBe(found);
    await expect(useCase.executeForEnrollment("enr-2")).resolves.toBeNull();
    expect(repository.findByEnrollmentId).toHaveBeenCalledWith("enr-2");
  });
});

describe("VerifyCertificateUseCase (ENT-45)", () => {
  it("retourne les informations imprimées d'un certificat valide", async () => {
    const repository = { findByNumber: jest.fn().mockResolvedValue(certificate()) };
    await expect(new VerifyCertificateUseCase(repository as never).execute("CERT-202601-ABCD1234")).resolves.toEqual({
      valid: true,
      learnerName: "Aïcha Koné",
      courseTitle: "Comptabilité",
      issuedAt: new Date("2026-01-15T00:00:00Z"),
      status: "VALID",
    });
  });

  it("invalide un certificat révoqué tout en indiquant son statut", async () => {
    const repository = { findByNumber: jest.fn().mockResolvedValue(certificate(CertificateStatus.REVOKED)) };
    await expect(new VerifyCertificateUseCase(repository as never).execute("X")).resolves.toMatchObject({
      valid: false,
      status: "REVOKED",
    });
  });

  it("retourne seulement valid=false pour un numéro inconnu", async () => {
    const repository = { findByNumber: jest.fn().mockResolvedValue(null) };
    await expect(new VerifyCertificateUseCase(repository as never).execute("X")).resolves.toEqual({ valid: false });
  });
});

describe("GetCertificateDownloadUrlUseCase", () => {
  function setup(found: unknown) {
    const repository = {
      findById: jest.fn().mockResolvedValue(found),
      findByIdInTenant: jest.fn().mockResolvedValue(found),
    };
    const storage = { createSignedDownloadUrl: jest.fn().mockResolvedValue("https://signed") };
    return { repository, storage, useCase: new GetCertificateDownloadUrlUseCase(repository as never, storage as never) };
  }

  it("signe l'URL pendant 5 minutes via la recherche par tenant quand le tenant est fourni", async () => {
    const { useCase, repository, storage } = setup(certificate());
    await expect(useCase.execute("cert-1", "t1")).resolves.toBe("https://signed");
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("cert-1", "t1");
    expect(repository.findById).not.toHaveBeenCalled();
    expect(storage.createSignedDownloadUrl).toHaveBeenCalledWith("key.pdf", 300);
  });

  it("utilise la recherche globale pour l'usage interne", async () => {
    const { useCase, repository } = setup(certificate());
    await useCase.execute("cert-1");
    expect(repository.findById).toHaveBeenCalledWith("cert-1");
    expect(repository.findByIdInTenant).not.toHaveBeenCalled();
  });

  it("lève NotFound sans signer pour un certificat inconnu", async () => {
    const { useCase, storage } = setup(null);
    await expect(useCase.execute("cert-1", "t1")).rejects.toThrow(NotFoundDomainError);
    expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
  });
});

describe("ListCertificatesUseCase", () => {
  it("liste les certificats du tenant", async () => {
    const list = [certificate()];
    const repository = { listByTenant: jest.fn().mockResolvedValue(list) };
    await expect(new ListCertificatesUseCase(repository as never).listForTenant("t1")).resolves.toBe(list);
    expect(repository.listByTenant).toHaveBeenCalledWith("t1");
  });
});

describe("certificate templates", () => {
  const template = CertificateTemplate.fromPersistence({
    id: "tpl-1",
    tenantId: "t1",
    name: "Modèle",
    design: DEFAULT_DESIGN,
    isDefault: false,
    createdAt: new Date(),
  });

  it("liste les modèles du tenant", async () => {
    const repository = { listByTenant: jest.fn().mockResolvedValue([template]) };
    await expect(new ListCertificateTemplatesUseCase(repository as never).execute("t1")).resolves.toEqual([template]);
    expect(repository.listByTenant).toHaveBeenCalledWith("t1");
  });

  it("crée un modèle par défaut après avoir retiré le défaut précédent", async () => {
    const order: string[] = [];
    const repository = {
      clearDefaultForTenant: jest.fn().mockImplementation(async () => void order.push("clear")),
      create: jest.fn().mockImplementation(async () => {
        order.push("create");
        return template;
      }),
    };
    const input = { tenantId: "t1", name: "Modèle", design: DEFAULT_DESIGN, isDefault: true };
    await expect(new CreateCertificateTemplateUseCase(repository as never).execute(input)).resolves.toBe(template);
    expect(order).toEqual(["clear", "create"]);
    expect(repository.clearDefaultForTenant).toHaveBeenCalledWith("t1");
    expect(repository.create).toHaveBeenCalledWith(input);
  });

  it("crée un modèle non défaut sans toucher au défaut existant", async () => {
    const repository = { clearDefaultForTenant: jest.fn(), create: jest.fn().mockResolvedValue(template) };
    await new CreateCertificateTemplateUseCase(repository as never).execute({
      tenantId: "t1",
      name: "Modèle",
      design: DEFAULT_DESIGN,
      isDefault: false,
    });
    expect(repository.clearDefaultForTenant).not.toHaveBeenCalled();
  });

  it("refuse un design invalide avant toute écriture", async () => {
    const repository = { clearDefaultForTenant: jest.fn(), create: jest.fn() };
    await expect(
      new CreateCertificateTemplateUseCase(repository as never).execute({
        tenantId: "t1",
        name: "Modèle",
        design: { ...DEFAULT_DESIGN, primaryColor: "javascript:1" },
        isDefault: true,
      }),
    ).rejects.toThrow(InvalidCertificateDesignError);
    expect(repository.clearDefaultForTenant).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
