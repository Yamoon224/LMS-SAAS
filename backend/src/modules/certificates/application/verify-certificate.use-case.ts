import { Inject, Injectable } from "@nestjs/common";

import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

export interface CertificateVerificationResult {
  valid: boolean;
  learnerName?: string;
  courseTitle?: string;
  issuedAt?: Date;
  status?: string;
}

/**
 * ENT-45/PUB: vérification publique d'un certificat par son numéro (lien
 * scanné depuis le QR code). Aucune authentification requise — ne révèle
 * que les informations déjà imprimées sur le certificat lui-même.
 */
@Injectable()
export class VerifyCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepositoryPort,
  ) {}

  async execute(number: string): Promise<CertificateVerificationResult> {
    const certificate = await this.certificateRepository.findByNumber(number);
    if (!certificate) {
      return { valid: false };
    }

    return {
      valid: certificate.isVerifiable(),
      learnerName: certificate.learnerNameSnapshot,
      courseTitle: certificate.courseTitleSnapshot,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
    };
  }
}
