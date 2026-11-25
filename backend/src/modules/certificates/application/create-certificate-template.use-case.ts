import { Inject, Injectable } from "@nestjs/common";

import { assertValidDesign } from "../domain/certificate-design";
import type { CertificateDesign, CertificateTemplate } from "../domain/certificate-template.entity";
import {
  CERTIFICATE_TEMPLATE_REPOSITORY,
  type CertificateTemplateRepositoryPort,
} from "../domain/certificate-template.repository.port";

export interface CreateCertificateTemplateInput {
  tenantId: string;
  name: string;
  design: CertificateDesign;
  isDefault: boolean;
}

/** ENT-38: création d'un modèle de certificat (mise en page, logo, insigne, signatures, couleurs). */
@Injectable()
export class CreateCertificateTemplateUseCase {
  constructor(
    @Inject(CERTIFICATE_TEMPLATE_REPOSITORY)
    private readonly templateRepository: CertificateTemplateRepositoryPort,
  ) {}

  async execute(input: CreateCertificateTemplateInput): Promise<CertificateTemplate> {
    assertValidDesign(input.design);
    if (input.isDefault) {
      await this.templateRepository.clearDefaultForTenant(input.tenantId);
    }

    return this.templateRepository.create({
      tenantId: input.tenantId,
      name: input.name,
      design: input.design,
      isDefault: input.isDefault,
    });
  }
}
