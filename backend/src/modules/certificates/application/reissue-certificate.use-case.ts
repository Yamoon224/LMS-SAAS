import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";
import { nanoid } from "nanoid";

import { buildCertificateNumber } from "../domain/certificate-number";
import {
  CERTIFICATE_PDF_RENDERER,
  type CertificatePdfRendererPort,
} from "../domain/certificate-pdf-renderer.port";
import { CERTIFICATE_STORAGE, type CertificateStoragePort } from "../domain/certificate-storage.port";
import {
  CERTIFICATE_TEMPLATE_REPOSITORY,
  type CertificateTemplateRepositoryPort,
} from "../domain/certificate-template.repository.port";
import type { Certificate } from "../domain/certificate.entity";
import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

/**
 * ENT-44: réémission d'un certificat (ex. nom de l'apprenant corrigé,
 * document perdu). RG-14 fige les informations à chaque délivrance : la
 * réémission régénère donc le nom depuis la fiche apprenant actuelle plutôt
 * que de recopier l'ancien instantané, puis gèle à nouveau ce nouvel
 * instantané sur le certificat nouvellement créé. L'original passe au
 * statut REISSUED et reste consultable pour l'historique.
 */
@Injectable()
export class ReissueCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepositoryPort,
    @Inject(CERTIFICATE_TEMPLATE_REPOSITORY)
    private readonly templateRepository: CertificateTemplateRepositoryPort,
    @Inject(CERTIFICATE_PDF_RENDERER) private readonly pdfRenderer: CertificatePdfRendererPort,
    @Inject(CERTIFICATE_STORAGE) private readonly storage: CertificateStoragePort,
    private readonly enrollmentsFacade: EnrollmentsFacade,
    private readonly usersFacade: UsersFacade,
    private readonly tenantsFacade: TenantsFacade,
  ) {}

  async execute(certificateId: string, tenantId: string): Promise<Certificate> {
    const original = await this.certificateRepository.findByIdInTenant(certificateId, tenantId);
    if (!original) {
      throw new NotFoundDomainError(`Certificat introuvable: ${certificateId}`);
    }

    const template = await this.templateRepository.findById(original.toSnapshot().templateId);
    if (!template) {
      throw new NotFoundDomainError("Modèle de certificat introuvable pour la réémission.");
    }

    const enrollment = await this.enrollmentsFacade.findById(original.enrollmentId);
    if (!enrollment) {
      throw new NotFoundDomainError("Inscription introuvable pour la réémission.");
    }

    const [learner, tenant] = await Promise.all([
      this.usersFacade.findById(enrollment.userId),
      this.tenantsFacade.findById(template.tenantId),
    ]);
    if (!learner || !tenant) {
      throw new NotFoundDomainError("Apprenant ou tenant introuvable pour la réémission.");
    }

    const issuedAt = new Date();
    const number = buildCertificateNumber(issuedAt, nanoid(8));
    const qrVerificationUrl = `https://${tenant.slug}.${process.env.APP_BASE_DOMAIN ?? "votredomaine.local"}/verify-certificate/${number}`;

    const pdf = await this.pdfRenderer.render({
      learnerName: learner.fullName,
      courseTitle: original.courseTitleSnapshot,
      number,
      issuedAt,
      scorePercent: original.scorePercent,
      qrVerificationUrl,
      design: template.design,
    });

    const storageKey = await this.storage.uploadPdf(template.tenantId, number, pdf);

    const reissued = await this.certificateRepository.create({
      enrollmentId: original.enrollmentId,
      templateId: template.id,
      number,
      learnerNameSnapshot: learner.fullName,
      courseTitleSnapshot: original.courseTitleSnapshot,
      scorePercent: original.scorePercent,
      pdfUrl: storageKey,
      qrVerificationUrl,
    });

    original.markReissued();
    await this.certificateRepository.save(original);

    return reissued;
  }
}
