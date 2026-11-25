import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import type { Certificate } from "../domain/certificate.entity";
import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

@Injectable()
export class GetCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepositoryPort,
  ) {}

  async execute(certificateId: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findById(certificateId);
    if (!certificate) {
      throw new NotFoundDomainError(`Certificat introuvable: ${certificateId}`);
    }
    return certificate;
  }

  /** RG-17: le certificat reste accessible même après expiration de l'accès au contenu. */
  async executeForEnrollment(enrollmentId: string): Promise<Certificate | null> {
    return this.certificateRepository.findByEnrollmentId(enrollmentId);
  }
}
