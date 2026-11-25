import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { CERTIFICATE_PDF_RENDERER } from "../domain/certificate-pdf-renderer.port";
import type { CertificatePdfRendererPort } from "../domain/certificate-pdf-renderer.port";
import { CERTIFICATE_TEMPLATE_REPOSITORY } from "../domain/certificate-template.repository.port";
import type { CertificateTemplateRepositoryPort } from "../domain/certificate-template.repository.port";
import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

/**
 * ADM-31 : aperçu d'un certificat déjà délivré, pour la supervision. Le PDF est recomposé à la demande à partir des
 * données figées à la délivrance (nom de l'apprenant, titre de la formation, numéro, score, date) et du design du modèle :
 * il ne dépend ni du fichier stocké (S3) ni d'une URL qui pourrait avoir expiré, et il ne modifie rien.
 */
@Injectable()
export class PreviewIssuedCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificates: CertificateRepositoryPort,
    @Inject(CERTIFICATE_TEMPLATE_REPOSITORY) private readonly templates: CertificateTemplateRepositoryPort,
    @Inject(CERTIFICATE_PDF_RENDERER) private readonly renderer: CertificatePdfRendererPort,
  ) {}

  async execute(number: string): Promise<Buffer> {
    const certificate = await this.certificates.findByNumber(number);
    if (!certificate) throw new NotFoundDomainError(`Certificat introuvable: ${number}`);

    const template = await this.templates.findById(certificate.templateId);
    if (!template) throw new NotFoundDomainError("Le modèle de ce certificat est introuvable.");

    return this.renderer.render({
      learnerName: certificate.learnerNameSnapshot,
      courseTitle: certificate.courseTitleSnapshot,
      number: certificate.number,
      issuedAt: certificate.issuedAt,
      scorePercent: certificate.scorePercent,
      qrVerificationUrl: certificate.qrVerificationUrl,
      design: template.design,
    });
  }
}
