import { CertificateIssuedEvent } from "../certificates.events";
import { CertificateTemplate } from "../domain/certificate-template.entity";
import { DEFAULT_DESIGN } from "../domain/certificate-design";

import { IssueCertificateUseCase } from "./issue-certificate.use-case";

const template = (id = "tpl-1") =>
  CertificateTemplate.fromPersistence({
    id,
    tenantId: "t1",
    name: "Modèle",
    design: DEFAULT_DESIGN,
    isDefault: true,
    createdAt: new Date(),
  });

interface Options {
  courseType?: string;
  courseTemplateId?: string | null;
  existing?: unknown;
  learner?: unknown;
  tenant?: unknown;
  byId?: unknown;
  defaultTemplate?: unknown;
  examResult?: unknown;
}

function build(options: Options = {}) {
  const has = <K extends keyof Options>(key: K, fallback: Options[K]) =>
    key in options ? options[key] : fallback;
  const certificates = {
    findByEnrollmentId: jest.fn().mockResolvedValue(has("existing", null)),
    create: jest.fn().mockResolvedValue({ id: "cert-new" }),
  };
  const templates = {
    findById: jest.fn().mockResolvedValue(has("byId", null)),
    findDefaultForTenant: jest.fn().mockResolvedValue(has("defaultTemplate", template("tpl-default"))),
  };
  const renderer = { render: jest.fn().mockResolvedValue(Buffer.from("pdf")) };
  const storage = { uploadPdf: jest.fn().mockResolvedValue("tenants/t1/certs/x.pdf") };
  const courses = {
    findById: jest.fn().mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      title: "Comptabilité",
      type: options.courseType ?? "CERTIFYING",
      certificateTemplateId: has("courseTemplateId", null),
      estimatedDurationMinutes: 120,
    }),
  };
  const users = { findById: jest.fn().mockResolvedValue(has("learner", { fullName: "Aïcha Koné" })) };
  const tenants = { findById: jest.fn().mockResolvedValue(has("tenant", { slug: "acme" })) };
  const assessments = {
    getExamResultForCourse: jest.fn().mockResolvedValue(has("examResult", { scorePercent: 88 })),
  };
  const emitter = { emit: jest.fn() };
  const useCase = new IssueCertificateUseCase(
    certificates as never,
    templates as never,
    renderer as never,
    storage as never,
    courses as never,
    users as never,
    tenants as never,
    assessments as never,
    emitter as never,
  );
  return { useCase, certificates, templates, renderer, storage, emitter, assessments };
}

const event = { enrollmentId: "enr-1", userId: "u1", courseId: "c1" } as never;

describe("IssueCertificateUseCase (RG-13)", () => {
  const originalDomain = process.env.APP_BASE_DOMAIN;
  afterEach(() => {
    if (originalDomain === undefined) delete process.env.APP_BASE_DOMAIN;
    else process.env.APP_BASE_DOMAIN = originalDomain;
  });

  it("ne délivre rien pour une formation non certifiante", async () => {
    const { useCase, certificates, renderer } = build({ courseType: "NON_CERTIFYING" });
    await useCase.handle(event);
    expect(certificates.findByEnrollmentId).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(certificates.create).not.toHaveBeenCalled();
  });

  it("est idempotent : un certificat existant empêche toute nouvelle délivrance", async () => {
    const { useCase, certificates, renderer, emitter } = build({ existing: { id: "cert-old" } });
    await useCase.handle(event);
    expect(renderer.render).not.toHaveBeenCalled();
    expect(certificates.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it.each([
    ["apprenant", { learner: null }],
    ["tenant", { tenant: null }],
    ["modèle", { defaultTemplate: null }],
  ])("n'émet rien si le %s est introuvable", async (_label, options) => {
    const { useCase, certificates, renderer, emitter } = build(options);
    await useCase.handle(event);
    expect(renderer.render).not.toHaveBeenCalled();
    expect(certificates.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("délivre le certificat : PDF rendu, stocké, créé avec valeurs figées, événement émis", async () => {
    process.env.APP_BASE_DOMAIN = "lms.test";
    const { useCase, certificates, renderer, storage, emitter } = build({ byId: null });

    await useCase.handle(event);

    const rendered = renderer.render.mock.calls[0][0];
    expect(rendered).toMatchObject({
      learnerName: "Aïcha Koné",
      courseTitle: "Comptabilité",
      scorePercent: 88,
      durationMinutes: 120,
      design: DEFAULT_DESIGN,
    });
    expect(rendered.number).toMatch(/^CERT-\d{6}-/);
    expect(rendered.qrVerificationUrl).toBe(`https://acme.lms.test/verify-certificate/${rendered.number}`);
    expect(storage.uploadPdf).toHaveBeenCalledWith("t1", rendered.number, Buffer.from("pdf"));
    expect(certificates.create).toHaveBeenCalledWith({
      enrollmentId: "enr-1",
      templateId: "tpl-default",
      number: rendered.number,
      learnerNameSnapshot: "Aïcha Koné",
      courseTitleSnapshot: "Comptabilité",
      scorePercent: 88,
      pdfUrl: "tenants/t1/certs/x.pdf",
      qrVerificationUrl: rendered.qrVerificationUrl,
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      "certificate.issued",
      new CertificateIssuedEvent("cert-new", "u1", "Comptabilité"),
    );
  });

  it("utilise le domaine par défaut et un score nul quand aucun examen n'existe", async () => {
    delete process.env.APP_BASE_DOMAIN;
    const { useCase, certificates, renderer } = build({ examResult: null });
    await useCase.handle(event);
    expect(renderer.render.mock.calls[0][0].qrVerificationUrl).toContain("acme.votredomaine.local");
    expect(certificates.create).toHaveBeenCalledWith(expect.objectContaining({ scorePercent: null }));
  });

  it("préfère le modèle choisi sur la formation et ne consulte pas le modèle par défaut", async () => {
    const { useCase, templates, certificates } = build({ courseTemplateId: "tpl-course", byId: template("tpl-course") });
    await useCase.handle(event);
    expect(templates.findById).toHaveBeenCalledWith("tpl-course");
    expect(templates.findDefaultForTenant).not.toHaveBeenCalled();
    expect(certificates.create).toHaveBeenCalledWith(expect.objectContaining({ templateId: "tpl-course" }));
  });

  it("retombe sur le modèle par défaut quand le modèle de la formation n'existe plus", async () => {
    const { useCase, templates, certificates } = build({ courseTemplateId: "tpl-gone", byId: null });
    await useCase.handle(event);
    expect(templates.findById).toHaveBeenCalledWith("tpl-gone");
    expect(templates.findDefaultForTenant).toHaveBeenCalledWith("t1");
    expect(certificates.create).toHaveBeenCalledWith(expect.objectContaining({ templateId: "tpl-default" }));
  });
});
