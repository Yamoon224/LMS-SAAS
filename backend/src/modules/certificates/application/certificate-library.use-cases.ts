import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { assertValidDesign, readabilityWarnings } from "../domain/certificate-design";
import type { CertificateDesign } from "../domain/certificate-design";
import {
  buildPreviewData,
  LIBRARY_NAME_MAX,
  LIBRARY_NAME_MIN,
  LibraryTemplateNameTakenError,
  normalizeLibraryName,
  sameLibraryName,
} from "../domain/certificate-library";
import type { LibraryTemplate } from "../domain/certificate-library";
import { CERTIFICATE_LIBRARY_REPOSITORY } from "../domain/certificate-library.repository.port";
import type { CertificateLibraryRepositoryPort } from "../domain/certificate-library.repository.port";
import { CERTIFICATE_PDF_RENDERER } from "../domain/certificate-pdf-renderer.port";
import type { CertificatePdfRendererPort } from "../domain/certificate-pdf-renderer.port";
import { CERTIFICATE_TEMPLATE_REPOSITORY } from "../domain/certificate-template.repository.port";
import type { CertificateTemplateRepositoryPort } from "../domain/certificate-template.repository.port";

export interface SaveLibraryTemplateInput {
  name: string;
  description?: string | null;
  design: CertificateDesign;
}

export interface LibraryTemplateWithWarnings extends LibraryTemplate {
  /** Avertissements de lisibilité (non bloquants). */
  warnings: string[];
}

/** Nom borné, design valide : les deux règles de tout enregistrement d'un modèle de la bibliothèque. */
function prepare(input: SaveLibraryTemplateInput) {
  const name = normalizeLibraryName(input.name);
  if (name.length < LIBRARY_NAME_MIN || name.length > LIBRARY_NAME_MAX) {
    throw new LibraryTemplateNameTakenError(
      `Le nom doit comporter entre ${LIBRARY_NAME_MIN} et ${LIBRARY_NAME_MAX} caractères.`,
    );
  }
  assertValidDesign(input.design);
  return { name, description: input.description?.trim() || null, design: input.design };
}

/** ADM-39 : gestion de la bibliothèque par l'Admin. */
@Injectable()
export class ManageCertificateLibraryUseCase {
  constructor(@Inject(CERTIFICATE_LIBRARY_REPOSITORY) private readonly repository: CertificateLibraryRepositoryPort) {}

  async list(): Promise<LibraryTemplateWithWarnings[]> {
    return (await this.repository.listAll()).map((template) => ({
      ...template,
      warnings: readabilityWarnings(template.design),
    }));
  }

  async create(input: SaveLibraryTemplateInput): Promise<LibraryTemplate> {
    const data = prepare(input);
    await this.assertNameAvailable(data.name);
    // Un nouveau modèle est un brouillon : l'Admin le prévisualise avant de le publier.
    return this.repository.create(data);
  }

  async update(id: string, input: SaveLibraryTemplateInput): Promise<void> {
    await this.getOrFail(id);
    const data = prepare(input);
    await this.assertNameAvailable(data.name, id);
    await this.repository.update(id, data);
  }

  async setPublished(id: string, published: boolean): Promise<void> {
    await this.getOrFail(id);
    await this.repository.setPublished(id, published);
  }

  /** Les copies déjà installées par des entreprises ne sont pas touchées : ce sont leurs propres modèles. */
  async delete(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.repository.delete(id);
  }

  private async getOrFail(id: string): Promise<LibraryTemplate> {
    const template = await this.repository.findById(id);
    if (!template) throw new NotFoundDomainError(`Modèle de la bibliothèque introuvable: ${id}`);
    return template;
  }

  private async assertNameAvailable(name: string, exceptId?: string): Promise<void> {
    const existing = await this.repository.listAll();
    if (existing.some((template) => template.id !== exceptId && sameLibraryName(template.name, name))) {
      throw new LibraryTemplateNameTakenError(`Un modèle nommé « ${name} » existe déjà dans la bibliothèque.`);
    }
  }
}

/** Aperçu PDF d'un design avec des données fictives : sert à l'Admin avant d'enregistrer, et aux entreprises. */
@Injectable()
export class PreviewCertificateDesignUseCase {
  constructor(
    @Inject(CERTIFICATE_PDF_RENDERER) private readonly renderer: CertificatePdfRendererPort,
    @Inject(CERTIFICATE_LIBRARY_REPOSITORY) private readonly repository: CertificateLibraryRepositoryPort,
  ) {}

  /** Aperçu d'un design saisi (Admin) : il doit être valide, comme à l'enregistrement. */
  async ofDesign(design: CertificateDesign): Promise<Buffer> {
    assertValidDesign(design);
    return this.renderer.render(buildPreviewData(design));
  }

  /** Aperçu d'un modèle PUBLIÉ de la bibliothèque (entreprise) ; un brouillon est introuvable. */
  async ofPublishedTemplate(id: string): Promise<Buffer> {
    const template = await this.repository.findById(id);
    if (!template || !template.isPublished) {
      throw new NotFoundDomainError(`Modèle de la bibliothèque introuvable: ${id}`);
    }
    return this.renderer.render(buildPreviewData(template.design));
  }
}

/** ENT-38 / ADM-39 : l'entreprise voit les modèles publiés et en installe une copie dans ses propres modèles. */
@Injectable()
export class UseCertificateLibraryTemplateUseCase {
  constructor(
    @Inject(CERTIFICATE_LIBRARY_REPOSITORY) private readonly library: CertificateLibraryRepositoryPort,
    @Inject(CERTIFICATE_TEMPLATE_REPOSITORY) private readonly templates: CertificateTemplateRepositoryPort,
  ) {}

  /** Seulement les modèles publiés, et seulement leurs champs de présentation. */
  async listPublished(): Promise<Pick<LibraryTemplate, "id" | "name" | "description" | "design">[]> {
    return (await this.library.listPublished()).map(({ id, name, description, design }) => ({
      id,
      name,
      description,
      design,
    }));
  }

  /**
   * Crée, pour CETTE entreprise, une copie du modèle publié. La copie est indépendante : une modification ou une
   * suppression ultérieure du modèle de la bibliothèque ne change pas les certificats déjà émis avec elle.
   */
  async install(tenantId: string, libraryTemplateId: string, makeDefault: boolean) {
    const template = await this.library.findById(libraryTemplateId);
    // Un brouillon est traité comme inexistant : une entreprise ne peut pas deviner l'identifiant d'un modèle non publié.
    if (!template || !template.isPublished) {
      throw new NotFoundDomainError(`Modèle de la bibliothèque introuvable: ${libraryTemplateId}`);
    }
    if (makeDefault) await this.templates.clearDefaultForTenant(tenantId);
    return this.templates.create({
      tenantId,
      name: template.name,
      design: { ...template.design },
      isDefault: makeDefault,
    });
  }
}
