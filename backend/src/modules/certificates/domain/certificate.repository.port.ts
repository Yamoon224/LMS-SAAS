import type { Certificate } from "./certificate.entity";

export interface CreateCertificateData {
  enrollmentId: string;
  templateId: string;
  number: string;
  learnerNameSnapshot: string;
  courseTitleSnapshot: string;
  scorePercent: number | null;
  pdfUrl: string;
  qrVerificationUrl: string;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface CertificateRepositoryPort {
  findById(id: string): Promise<Certificate | null>;
  /** Certificat d'une formation du tenant (certificat -> inscription -> formation -> tenant), sinon null. */
  findByIdInTenant(id: string, tenantId: string): Promise<Certificate | null>;
  findByEnrollmentId(enrollmentId: string): Promise<Certificate | null>;
  /** RG-13: numéro unique — sert à vérifier l'absence de collision avant insertion. */
  findByNumber(number: string): Promise<Certificate | null>;
  listByTenant(tenantId: string): Promise<Certificate[]>;
  create(data: CreateCertificateData): Promise<Certificate>;
  save(certificate: Certificate): Promise<void>;
}

export const CERTIFICATE_REPOSITORY = Symbol("CERTIFICATE_REPOSITORY");
