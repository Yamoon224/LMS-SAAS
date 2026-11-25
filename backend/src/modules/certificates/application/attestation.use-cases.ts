import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { AttestationRevokedEvent } from "../certificates.events";
import type { Attestation } from "../domain/attestation.entity";
import { ATTESTATION_REPOSITORY, type AttestationRepositoryPort } from "../domain/attestation.repository.port";
import { CERTIFICATE_STORAGE, type CertificateStoragePort } from "../domain/certificate-storage.port";

const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/** ENT-44: attestations délivrées par l'entreprise, et attestations d'un apprenant. */
@Injectable()
export class ListAttestationsUseCase {
  constructor(@Inject(ATTESTATION_REPOSITORY) private readonly repository: AttestationRepositoryPort) {}

  listForTenant(tenantId: string): Promise<Attestation[]> {
    return this.repository.listByTenant(tenantId);
  }

  listForLearner(userId: string, tenantId: string): Promise<Attestation[]> {
    return this.repository.listByUser(userId, tenantId);
  }

  findByEnrollmentId(enrollmentId: string): Promise<Attestation | null> {
    return this.repository.findByEnrollmentId(enrollmentId);
  }
}

/** URL signée à durée limitée (jamais d'accès S3 direct). */
@Injectable()
export class GetAttestationDownloadUrlUseCase {
  constructor(
    @Inject(ATTESTATION_REPOSITORY) private readonly repository: AttestationRepositoryPort,
    @Inject(CERTIFICATE_STORAGE) private readonly storage: CertificateStoragePort,
    private readonly enrollmentsFacade: EnrollmentsFacade,
  ) {}

  /** Vue entreprise : l'attestation doit appartenir au tenant. */
  async executeForTenant(attestationId: string, tenantId: string): Promise<string> {
    const attestation = await this.repository.findByIdInTenant(attestationId, tenantId);
    if (!attestation) throw new NotFoundDomainError(`Attestation introuvable: ${attestationId}`);
    return this.sign(attestation);
  }

  /** Vue apprenant (anti-IDOR) : l'inscription doit appartenir à l'apprenant connecté, dans son tenant. */
  async executeForLearner(attestationId: string, userId: string, tenantId: string): Promise<string> {
    const attestation = await this.repository.findById(attestationId);
    if (!attestation) throw new NotFoundDomainError(`Attestation introuvable: ${attestationId}`);
    await this.enrollmentsFacade.findOwnedByUser(attestation.enrollmentId, userId, tenantId);
    return this.sign(attestation);
  }

  /** Usage interne (notifications). */
  async executeInternal(attestationId: string): Promise<string> {
    const attestation = await this.repository.findById(attestationId);
    if (!attestation) throw new NotFoundDomainError(`Attestation introuvable: ${attestationId}`);
    return this.sign(attestation);
  }

  private sign(attestation: Attestation): Promise<string> {
    return this.storage.createSignedDownloadUrl(attestation.pdfUrl, DOWNLOAD_URL_TTL_SECONDS);
  }
}

/** ENT-44: révocation d'une attestation, motif obligatoire, tracée au journal d'audit via l'événement émis. */
@Injectable()
export class RevokeAttestationUseCase {
  constructor(
    @Inject(ATTESTATION_REPOSITORY) private readonly repository: AttestationRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(attestationId: string, tenantId: string, reason: string, actorId: string | null): Promise<void> {
    const attestation = await this.repository.findByIdInTenant(attestationId, tenantId);
    if (!attestation) throw new NotFoundDomainError(`Attestation introuvable: ${attestationId}`);

    attestation.revoke(reason);
    await this.repository.save(attestation);
    this.eventEmitter.emit(
      "attestation.revoked",
      new AttestationRevokedEvent(attestation.id, tenantId, actorId, attestation.revocationReason ?? reason),
    );
  }
}

export interface AttestationVerificationResult {
  valid: boolean;
  type: "ATTESTATION";
  learnerName?: string;
  courseTitle?: string;
  issuedAt?: Date;
  status?: string;
  progressPercent?: number;
}

/** Vérification publique par numéro : ne révèle que ce qui est imprimé sur l'attestation. */
@Injectable()
export class VerifyAttestationUseCase {
  constructor(@Inject(ATTESTATION_REPOSITORY) private readonly repository: AttestationRepositoryPort) {}

  async execute(number: string): Promise<AttestationVerificationResult> {
    const attestation = await this.repository.findByNumber(number.trim().toUpperCase());
    if (!attestation) return { valid: false, type: "ATTESTATION" };
    return {
      valid: attestation.isVerifiable(),
      type: "ATTESTATION",
      learnerName: attestation.learnerNameSnapshot,
      courseTitle: attestation.courseTitleSnapshot,
      issuedAt: attestation.issuedAt,
      status: attestation.status,
      progressPercent: attestation.progressPercent,
    };
  }
}
