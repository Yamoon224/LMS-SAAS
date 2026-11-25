import { Injectable } from "@nestjs/common";

import { GetAttestationDownloadUrlUseCase } from "./application/attestation.use-cases";
import { GetCertificateDownloadUrlUseCase } from "./application/get-certificate-download-url.use-case";
import { GetCertificateUseCase } from "./application/get-certificate.use-case";
import type { Certificate } from "./domain/certificate.entity";

/**
 * Seule API publique du module certificates. Utilisée par notifications
 * pour obtenir l'URL signée du PDF à inclure dans l'e-mail de délivrance
 * (ENT-41).
 */
@Injectable()
export class CertificatesFacade {
  constructor(
    private readonly getCertificateUseCase: GetCertificateUseCase,
    private readonly getCertificateDownloadUrlUseCase: GetCertificateDownloadUrlUseCase,
    private readonly getAttestationDownloadUrlUseCase: GetAttestationDownloadUrlUseCase,
  ) {}

  async findByEnrollmentId(enrollmentId: string): Promise<Certificate | null> {
    return this.getCertificateUseCase.executeForEnrollment(enrollmentId);
  }

  async getDownloadUrl(certificateId: string): Promise<string> {
    return this.getCertificateDownloadUrlUseCase.execute(certificateId);
  }

  /** ENT-44: URL signée du PDF d'une attestation de suivi (e-mail de délivrance). */
  async getAttestationDownloadUrl(attestationId: string): Promise<string> {
    return this.getAttestationDownloadUrlUseCase.executeInternal(attestationId);
  }
}
