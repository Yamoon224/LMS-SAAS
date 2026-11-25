import { NotFoundDomainError } from "@shared/errors";

import { InvalidCertificateDesignError } from "../domain/certificate-design";
import type { CertificateDesign } from "../domain/certificate-design";
import { buildPreviewData, LibraryTemplateNameTakenError } from "../domain/certificate-library";
import type { LibraryTemplate } from "../domain/certificate-library";
import type { CertificateLibraryRepositoryPort } from "../domain/certificate-library.repository.port";
import type { CertificateTemplateRepositoryPort } from "../domain/certificate-template.repository.port";
import { PdfKitCertificateRendererAdapter } from "../infrastructure/pdfkit-certificate-renderer.adapter";

import {
  ManageCertificateLibraryUseCase,
  PreviewCertificateDesignUseCase,
  UseCertificateLibraryTemplateUseCase,
} from "./certificate-library.use-cases";

const template = (overrides: Partial<LibraryTemplate> = {}): LibraryTemplate => ({
  id: "lib-1",
  name: "Classique bleu",
  description: null,
  design: { primaryColor: "#1e3a8a", fontFamily: "TIMES" },
  isPublished: true,
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-01T00:00:00Z"),
  ...overrides,
});

function buildLibrary(items: LibraryTemplate[] = []): jest.Mocked<CertificateLibraryRepositoryPort> {
  return {
    listAll: jest.fn().mockResolvedValue(items),
    listPublished: jest.fn().mockResolvedValue(items.filter((item) => item.isPublished)),
    findById: jest.fn().mockImplementation(async (id: string) => items.find((item) => item.id === id) ?? null),
    create: jest.fn().mockImplementation(async (data) => template({ ...data, id: "new", isPublished: false })),
    update: jest.fn().mockResolvedValue(undefined),
    setPublished: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function buildTenantTemplates(): jest.Mocked<CertificateTemplateRepositoryPort> {
  return {
    findById: jest.fn(),
    findDefaultForTenant: jest.fn(),
    listByTenant: jest.fn(),
    create: jest.fn().mockImplementation(async (data) => ({ id: "copy-1", ...data })),
    clearDefaultForTenant: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CertificateTemplateRepositoryPort>;
}

describe("ManageCertificateLibraryUseCase", () => {
  it("crée un modèle en brouillon avec un nom normalisé", async () => {
    const library = buildLibrary();
    await new ManageCertificateLibraryUseCase(library).create({
      name: "  Élégant   doré ",
      description: " Sobre ",
      design: { primaryColor: "#b8860b" },
    });
    expect(library.create).toHaveBeenCalledWith({
      name: "Élégant doré",
      description: "Sobre",
      design: { primaryColor: "#b8860b" },
    });
  });

  it.each([
    ["couleur libre", { primaryColor: "rouge" }],
    ["police inconnue", { fontFamily: "COMIC_SANS" as never }],
    ["orientation inconnue", { orientation: "DIAGONAL" as never }],
  ])("refuse un design invalide (%s) sans rien enregistrer", async (_label, design) => {
    const library = buildLibrary();
    await expect(new ManageCertificateLibraryUseCase(library).create({ name: "Modèle", design })).rejects.toThrow(
      InvalidCertificateDesignError,
    );
    expect(library.create).not.toHaveBeenCalled();
  });

  it("refuse un nom déjà pris, sans tenir compte de la casse ni des espaces", async () => {
    const library = buildLibrary([template({ name: "Classique bleu" })]);
    await expect(
      new ManageCertificateLibraryUseCase(library).create({ name: "  CLASSIQUE   bleu ", design: {} }),
    ).rejects.toThrow(LibraryTemplateNameTakenError);
    expect(library.create).not.toHaveBeenCalled();
  });

  it("autorise de garder son propre nom en modifiant un modèle, mais pas de prendre celui d'un autre", async () => {
    const library = buildLibrary([template({ id: "a", name: "Alpha" }), template({ id: "b", name: "Beta" })]);
    const useCase = new ManageCertificateLibraryUseCase(library);
    await expect(useCase.update("a", { name: "Alpha", design: {} })).resolves.toBeUndefined();
    await expect(useCase.update("a", { name: "beta", design: {} })).rejects.toThrow(LibraryTemplateNameTakenError);
  });

  it("signale un modèle introuvable", async () => {
    const useCase = new ManageCertificateLibraryUseCase(buildLibrary());
    await expect(useCase.update("x", { name: "Nom", design: {} })).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.setPublished("x", true)).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.delete("x")).rejects.toThrow(NotFoundDomainError);
  });

  it("joint des avertissements de lisibilité à la liste, sans bloquer l'enregistrement", async () => {
    const library = buildLibrary([template({ design: { textColor: "#eeeeee" } })]);
    const [item] = await new ManageCertificateLibraryUseCase(library).list();
    expect(item?.warnings.length).toBeGreaterThan(0);
  });
});

describe("UseCertificateLibraryTemplateUseCase", () => {
  it("ne liste que les modèles publiés, avec leurs seuls champs de présentation", async () => {
    const library = buildLibrary([template({ id: "pub" }), template({ id: "brouillon", name: "Brouillon", isPublished: false })]);
    const listed = await new UseCertificateLibraryTemplateUseCase(library, buildTenantTemplates()).listPublished();
    expect(listed.map((item) => item.id)).toEqual(["pub"]);
    expect(Object.keys(listed[0] ?? {}).sort()).toEqual(["description", "design", "id", "name"]);
  });

  it("crée une COPIE dans les modèles de l'entreprise appelante", async () => {
    const library = buildLibrary([template()]);
    const tenants = buildTenantTemplates();
    await new UseCertificateLibraryTemplateUseCase(library, tenants).install("tenant-1", "lib-1", false);
    expect(tenants.create).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      name: "Classique bleu",
      design: { primaryColor: "#1e3a8a", fontFamily: "TIMES" },
      isDefault: false,
    });
    expect(tenants.clearDefaultForTenant).not.toHaveBeenCalled();
  });

  it("la copie est indépendante : modifier le design de la copie ne touche pas le modèle de la bibliothèque", async () => {
    const original = template();
    const tenants = buildTenantTemplates();
    await new UseCertificateLibraryTemplateUseCase(buildLibrary([original]), tenants).install("t", "lib-1", false);
    const copy = tenants.create.mock.calls[0]?.[0].design as CertificateDesign;
    expect(copy).not.toBe(original.design);
    copy.primaryColor = "#000000";
    expect(original.design.primaryColor).toBe("#1e3a8a");
  });

  it("définit la copie comme modèle par défaut en retirant d'abord l'ancien, uniquement pour cette entreprise", async () => {
    const tenants = buildTenantTemplates();
    await new UseCertificateLibraryTemplateUseCase(buildLibrary([template()]), tenants).install("tenant-1", "lib-1", true);
    expect(tenants.clearDefaultForTenant).toHaveBeenCalledWith("tenant-1");
    expect(tenants.create).toHaveBeenCalledWith(expect.objectContaining({ isDefault: true }));
  });

  it("traite un brouillon comme inexistant : une entreprise ne peut pas l'installer en devinant son identifiant", async () => {
    const library = buildLibrary([template({ id: "brouillon", isPublished: false })]);
    const tenants = buildTenantTemplates();
    await expect(
      new UseCertificateLibraryTemplateUseCase(library, tenants).install("tenant-1", "brouillon", true),
    ).rejects.toThrow(NotFoundDomainError);
    expect(tenants.create).not.toHaveBeenCalled();
    expect(tenants.clearDefaultForTenant).not.toHaveBeenCalled();
  });
});

describe("PreviewCertificateDesignUseCase", () => {
  const renderer = new PdfKitCertificateRendererAdapter();

  it("produit un PDF à partir d'un design valide", async () => {
    const pdf = await new PreviewCertificateDesignUseCase(renderer, buildLibrary()).ofDesign({ orientation: "PORTRAIT" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("refuse un design invalide avant tout rendu", async () => {
    await expect(
      new PreviewCertificateDesignUseCase(renderer, buildLibrary()).ofDesign({ primaryColor: "rouge" }),
    ).rejects.toThrow(InvalidCertificateDesignError);
  });

  it("n'aperçoit un modèle de la bibliothèque que s'il est publié", async () => {
    const library = buildLibrary([template(), template({ id: "brouillon", name: "B", isPublished: false })]);
    const useCase = new PreviewCertificateDesignUseCase(renderer, library);
    await expect(useCase.ofPublishedTemplate("lib-1")).resolves.toBeInstanceOf(Buffer);
    await expect(useCase.ofPublishedTemplate("brouillon")).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.ofPublishedTemplate("inconnu")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("buildPreviewData", () => {
  it("n'utilise que des données fictives (jamais d'apprenant, de formation ni de numéro réels)", () => {
    const data = buildPreviewData({});
    expect(data.number).toContain("EXEMPLE");
    expect(data.qrVerificationUrl).toContain("example.com");
    expect(data.learnerName).toBe("Prénom Nom");
  });
});
