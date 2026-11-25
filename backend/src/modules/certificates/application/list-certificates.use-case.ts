import { Inject, Injectable } from "@nestjs/common";

import type { Certificate } from "../domain/certificate.entity";
import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

/** ENT-42/ENT-43: liste des certificats émis par l'entreprise, avec filtres (export, recherche). */
@Injectable()
export class ListCertificatesUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepositoryPort,
  ) {}

  async listForTenant(tenantId: string): Promise<Certificate[]> {
    return this.certificateRepository.listByTenant(tenantId);
  }
}
