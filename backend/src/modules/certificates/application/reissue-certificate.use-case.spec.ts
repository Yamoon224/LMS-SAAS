import { NotFoundDomainError } from "@shared/errors";

import { DEFAULT_DESIGN } from "../domain/certificate-design";
import { CertificateStatus } from "../domain/certificate-status";
import { CertificateTemplate } from "../domain/certificate-template.entity";
import { Certificate } from "../domain/certificate.entity";

import { ReissueCertificateUseCase } from "./reissue-certificate.use-case";

const original = () =>
  Certificate.fromPersistence({
    id: "cert-1",
    enrollmentId: "enr-1",
    templateId: "tpl-1",
    number: "CERT-202601-OLD",
    status: CertificateStatus.VALID,
    learnerNameSnapshot: "Ancien Nom",
    courseTitleSnapshot: "Comptabilité",
    scorePercent: 77,
    pdfUrl: "old.pdf",
    qrVerificationUrl: "old-url",
    revocationReason: null,
    issuedAt: new Date("2026-01-15T00:00:00Z"),
    revokedAt: null,
  });

const template = CertificateTemplate.fromPersistence({
  id: "tpl-1",
  tenantId: "t1",
  name: "Modèle",
  design: DEFAULT_DESIGN,
  isDefault: true,
  createdAt: new Date(),
});

function build(overrides: Record<string, unknown> = {}) {
  const cert = "found" in overrides ? overrides.found : original();
  const certificates = {
    findByIdInTenant: jest.fn().mockResolvedValue(cert),
    create: jest.fn().mockResolvedValue({ id: "cert-new" }),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const templates = { findById: jest.fn().mockResolvedValue("template" in overrides ? overrides.template : template) };
  const renderer = { render: jest.fn().mockResolvedValue(Buffer.from("pdf")) };
  const storage = { uploadPdf: jest.fn().mockResolvedValue("new.pdf") };
  const enrollments = {
    findById: jest.fn().mockResolvedValue("enrollment" in overrides ? overrides.enrollment : { userId: "u1" }),
  };
  const users = {
    findById: jest.fn().mockResolvedValue("learner" in overrides ? overrides.learner : { fullName: "Nouveau Nom" }),
  };
  const tenants = { findById: jest.fn().mockResolvedValue("tenant" in overrides ? overrides.tenant : { slug: "acme" }) };
  const useCase = new ReissueCertificateUseCase(
    certificates as never,
    templates as never,
    renderer as never,
    storage as never,
    enrollments as never,
    users as never,
    tenants as never,
  );
  return { useCase, certificates, renderer, storage, cert: cert as Certificate };
}

describe("ReissueCertificateUseCase (ENT-44)", () => {
  const originalDomain = process.env.APP_BASE_DOMAIN;
  afterEach(() => {
    if (originalDomain === undefined) delete process.env.APP_BASE_DOMAIN;
    else process.env.APP_BASE_DOMAIN = originalDomain;
  });

  it.each([
    ["certificat", { found: null }],
    ["modèle", { template: null }],
    ["inscription", { enrollment: null }],
    ["apprenant", { learner: null }],
    ["tenant", { tenant: null }],
  ])("lève NotFound si le %s est introuvable, sans rien créer", async (_label, overrides) => {
    const { useCase, certificates, storage } = build(overrides);
    await expect(useCase.execute("cert-1", "t1")).rejects.toThrow(NotFoundDomainError);
    expect(storage.uploadPdf).not.toHaveBeenCalled();
    expect(certificates.create).not.toHaveBeenCalled();
    expect(certificates.save).not.toHaveBeenCalled();
  });

  it("régénère le nom depuis la fiche actuelle, crée le nouveau certificat et marque l'original REISSUED", async () => {
    process.env.APP_BASE_DOMAIN = "lms.test";
    const { useCase, certificates, renderer, storage, cert } = build();

    const result = await useCase.execute("cert-1", "t1");

    const rendered = renderer.render.mock.calls[0][0];
    expect(rendered).toMatchObject({
      learnerName: "Nouveau Nom",
      courseTitle: "Comptabilité",
      scorePercent: 77,
      design: DEFAULT_DESIGN,
    });
    expect(rendered.number).not.toBe("CERT-202601-OLD");
    expect(rendered.qrVerificationUrl).toBe(`https://acme.lms.test/verify-certificate/${rendered.number}`);
    expect(storage.uploadPdf).toHaveBeenCalledWith("t1", rendered.number, Buffer.from("pdf"));
    expect(certificates.create).toHaveBeenCalledWith({
      enrollmentId: "enr-1",
      templateId: "tpl-1",
      number: rendered.number,
      learnerNameSnapshot: "Nouveau Nom",
      courseTitleSnapshot: "Comptabilité",
      scorePercent: 77,
      pdfUrl: "new.pdf",
      qrVerificationUrl: rendered.qrVerificationUrl,
    });
    expect(cert.status).toBe(CertificateStatus.REISSUED);
    expect(certificates.save).toHaveBeenCalledWith(cert);
    expect(result).toEqual({ id: "cert-new" });
  });

  it("utilise le domaine par défaut quand APP_BASE_DOMAIN est absent", async () => {
    delete process.env.APP_BASE_DOMAIN;
    const { useCase, renderer } = build();
    await useCase.execute("cert-1", "t1");
    expect(renderer.render.mock.calls[0][0].qrVerificationUrl).toContain("acme.votredomaine.local");
  });
});
