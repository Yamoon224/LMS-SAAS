import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { CERTIFICATE_STORAGE, type CertificateStoragePort } from "../domain/certificate-storage.port";
import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/** PUB/ENT: URL signée à durée limitée pour télécharger le PDF (section 11, jamais d'accès S3 direct). */
@Injectable()
export class GetCertificateDownloadUrlUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepositoryPort,
    @Inject(CERTIFICATE_STORAGE) private readonly storage: CertificateStoragePort,
  ) {}

  /** `tenantId` fourni (vue entreprise): le certificat doit appartenir à ce tenant. Omis: usage interne (notifications). */
  async execute(certificateId: string, tenantId?: string): Promise<string> {
    const certificate = tenantId
      ? await this.certificateRepository.findByIdInTenant(certificateId, tenantId)
      : await this.certificateRepository.findById(certificateId);
    if (!certificate) {
      throw new NotFoundDomainError(`Certificat introuvable: ${certificateId}`);
    }

    return this.storage.createSignedDownloadUrl(certificate.pdfUrl, DOWNLOAD_URL_TTL_SECONDS);
  }
}
