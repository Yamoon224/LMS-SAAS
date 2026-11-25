import { AssessmentsFacade } from "@modules/assessments/assessments.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { EnrollmentCompletedEvent } from "@modules/enrollments/enrollments.events";
import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { nanoid } from "nanoid";

import { CertificateIssuedEvent } from "../certificates.events";
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
import { CERTIFICATE_REPOSITORY } from "../domain/certificate.repository.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

/**
 * Dupliqué depuis courses/domain/course-type.ts plutôt qu'importé — un
 * module ne doit jamais dépendre des fichiers internes (domain/...) d'un
 * autre module (section 13.2).
 */
const CERTIFYING_COURSE_TYPE = "CERTIFYING";

/**
 * RG-13: "pour une formation certifiante, le certificat est délivré
 * automatiquement si l'examen est réussi et toutes les conditions remplies."
 * S'abonne à EnrollmentCompleted plutôt qu'à exam.passed directement : au
 * moment où cet événement est émis, enrollments a déjà vérifié que toutes
 * les conditions de complétion sont réunies (l'examen n'est marqué réussi
 * qu'après franchissement de la note minimale, voir SubmitAttemptUseCase).
 */
@Injectable()
export class IssueCertificateUseCase {
  private readonly logger = new Logger(IssueCertificateUseCase.name);

  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepositoryPort,
    @Inject(CERTIFICATE_TEMPLATE_REPOSITORY)
    private readonly templateRepository: CertificateTemplateRepositoryPort,
    @Inject(CERTIFICATE_PDF_RENDERER) private readonly pdfRenderer: CertificatePdfRendererPort,
    @Inject(CERTIFICATE_STORAGE) private readonly storage: CertificateStoragePort,
    private readonly coursesFacade: CoursesFacade,
    private readonly usersFacade: UsersFacade,
    private readonly tenantsFacade: TenantsFacade,
    private readonly assessmentsFacade: AssessmentsFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent("enrollment.completed")
  async handle(event: EnrollmentCompletedEvent): Promise<void> {
    const course = await this.coursesFacade.findById(event.courseId);
    if (course.type !== CERTIFYING_COURSE_TYPE) {
      return;
    }

    const existing = await this.certificateRepository.findByEnrollmentId(event.enrollmentId);
    if (existing) {
      return;
    }

    const [learner, tenant, template, examResult] = await Promise.all([
      this.usersFacade.findById(event.userId),
      this.tenantsFacade.findById(course.tenantId),
      this.resolveTemplate(course.tenantId, course.certificateTemplateId),
      this.assessmentsFacade.getExamResultForCourse(event.enrollmentId, event.courseId),
    ]);

    if (!learner || !tenant || !template) {
      this.logger.error(
        `Impossible de délivrer le certificat pour l'inscription ${event.enrollmentId}: ` +
          "apprenant, tenant ou modèle de certificat introuvable.",
      );
      return;
    }

    const issuedAt = new Date();
    const number = buildCertificateNumber(issuedAt, nanoid(8));
    const qrVerificationUrl = this.buildVerificationUrl(tenant.slug, number);

    const pdf = await this.pdfRenderer.render({
      learnerName: learner.fullName,
      courseTitle: course.title,
      number,
      issuedAt,
      scorePercent: examResult?.scorePercent ?? null,
      qrVerificationUrl,
      durationMinutes: course.estimatedDurationMinutes,
      design: template.design,
    });

    const storageKey = await this.storage.uploadPdf(course.tenantId, number, pdf);

    const certificate = await this.certificateRepository.create({
      enrollmentId: event.enrollmentId,
      templateId: template.id,
      number,
      learnerNameSnapshot: learner.fullName,
      courseTitleSnapshot: course.title,
      scorePercent: examResult?.scorePercent ?? null,
      pdfUrl: storageKey,
      qrVerificationUrl,
    });

    this.eventEmitter.emit(
      "certificate.issued",
      new CertificateIssuedEvent(certificate.id, event.userId, course.title),
    );
  }

  private async resolveTemplate(tenantId: string, courseTemplateId: string | null) {
    if (courseTemplateId) {
      const template = await this.templateRepository.findById(courseTemplateId);
      if (template) return template;
    }
    return this.templateRepository.findDefaultForTenant(tenantId);
  }

  private buildVerificationUrl(tenantSlug: string, number: string): string {
    const baseDomain = process.env.APP_BASE_DOMAIN ?? "votredomaine.local";
    return `https://${tenantSlug}.${baseDomain}/verify-certificate/${number}`;
  }
}
