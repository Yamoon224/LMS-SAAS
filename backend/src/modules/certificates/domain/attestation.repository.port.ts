import type { Attestation } from "./attestation.entity";

export interface CreateAttestationData {
  enrollmentId: string;
  number: string;
  learnerNameSnapshot: string;
  courseTitleSnapshot: string;
  progressPercent: number;
  durationMinutes: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  pdfUrl: string;
  qrVerificationUrl: string;
}

export interface AttestationRepositoryPort {
  findById(id: string): Promise<Attestation | null>;
  /** Attestation d'une formation du tenant (attestation -> inscription -> formation -> tenant), sinon null. */
  findByIdInTenant(id: string, tenantId: string): Promise<Attestation | null>;
  findByEnrollmentId(enrollmentId: string): Promise<Attestation | null>;
  findByNumber(number: string): Promise<Attestation | null>;
  listByTenant(tenantId: string): Promise<Attestation[]>;
  /** Attestations des inscriptions d'un apprenant. */
  listByUser(userId: string, tenantId: string): Promise<Attestation[]>;
  /** Lève une erreur de contrainte unique si l'inscription a déjà une attestation (idempotence en concurrence). */
  create(data: CreateAttestationData): Promise<Attestation>;
  save(attestation: Attestation): Promise<void>;
}

export const ATTESTATION_REPOSITORY = Symbol("ATTESTATION_REPOSITORY");
