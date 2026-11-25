import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

/** ENT-44: révocation d'un certificat par un gestionnaire, motif obligatoire. */
@Injectable()
export class RevokeCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepositoryPort,
  ) {}

  async execute(certificateId: string, tenantId: string, reason: string): Promise<void> {
    const certificate = await this.certificateRepository.findByIdInTenant(certificateId, tenantId);
    if (!certificate) {
      throw new NotFoundDomainError(`Certificat introuvable: ${certificateId}`);
    }

    certificate.revoke(reason);
    await this.certificateRepository.save(certificate);
  }
}
