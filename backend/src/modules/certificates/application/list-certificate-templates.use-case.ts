import { Inject, Injectable } from "@nestjs/common";

import type { CertificateTemplate } from "../domain/certificate-template.entity";
import {
  CERTIFICATE_TEMPLATE_REPOSITORY,
  type CertificateTemplateRepositoryPort,
} from "../domain/certificate-template.repository.port";

@Injectable()
export class ListCertificateTemplatesUseCase {
  constructor(
    @Inject(CERTIFICATE_TEMPLATE_REPOSITORY)
    private readonly templateRepository: CertificateTemplateRepositoryPort,
  ) {}

  async execute(tenantId: string): Promise<CertificateTemplate[]> {
    return this.templateRepository.listByTenant(tenantId);
  }
}
