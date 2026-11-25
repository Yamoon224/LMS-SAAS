import type { CertificateDesign, CertificateTemplate } from "./certificate-template.entity";

export interface CreateCertificateTemplateData {
  tenantId: string;
  name: string;
  design: CertificateDesign;
  isDefault: boolean;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface CertificateTemplateRepositoryPort {
  findById(id: string): Promise<CertificateTemplate | null>;
  findDefaultForTenant(tenantId: string): Promise<CertificateTemplate | null>;
  listByTenant(tenantId: string): Promise<CertificateTemplate[]>;
  create(data: CreateCertificateTemplateData): Promise<CertificateTemplate>;
  /** ENT-38: un seul modèle par défaut par tenant — repasse les autres à false. */
  clearDefaultForTenant(tenantId: string): Promise<void>;
}

export const CERTIFICATE_TEMPLATE_REPOSITORY = Symbol("CERTIFICATE_TEMPLATE_REPOSITORY");
