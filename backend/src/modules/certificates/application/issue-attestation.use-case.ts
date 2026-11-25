import { CoursesFacade } from "@modules/courses/courses.facade";
import { EnrollmentCompletedEvent } from "@modules/enrollments/enrollments.events";
import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { nanoid } from "nanoid";

import { AttestationIssuedEvent } from "../certificates.events";
import { buildAttestationNumber } from "../domain/attestation-number";
import { ATTESTATION_PDF_RENDERER, type AttestationPdfRendererPort } from "../domain/attestation-pdf-renderer.port";
import { ATTESTATION_REPOSITORY, type AttestationRepositoryPort } from "../domain/attestation.repository.port";
import { isAttestationEligibleCourseType } from "../domain/attestation.entity";
import { CERTIFICATE_STORAGE, type CertificateStoragePort } from "../domain/certificate-storage.port";

/** Violation de contrainte unique Prisma (une attestation existe déjà pour l'inscription). */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/**
 * ENT-44: attestation de suivi d'une formation NON certifiante, délivrée automatiquement quand l'inscription est
 * complétée (règle RG-21 déjà appliquée par enrollments avant d'émettre `enrollment.completed`). Si la formation
 * est certifiante, c'est le certificat qui s'applique : aucune attestation. Idempotente : une seule attestation par
 * inscription.
 */
@Injectable()
export class IssueAttestationUseCase {
  private readonly logger = new Logger(IssueAttestationUseCase.name);

  constructor(
    @Inject(ATTESTATION_REPOSITORY) private readonly attestationRepository: AttestationRepositoryPort,
    @Inject(ATTESTATION_PDF_RENDERER) private readonly pdfRenderer: AttestationPdfRendererPort,
    @Inject(CERTIFICATE_STORAGE) private readonly storage: CertificateStoragePort,
    private readonly coursesFacade: CoursesFacade,
    private readonly usersFacade: UsersFacade,
    private readonly tenantsFacade: TenantsFacade,
    private readonly enrollmentsFacade: EnrollmentsFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent("enrollment.completed")
  async handle(event: EnrollmentCompletedEvent): Promise<void> {
    try {
      await this.execute(event);
    } catch (error) {
      // Un échec de génération ne doit jamais bloquer la complétion de l'inscription.
      this.logger.error(
        `Échec de la délivrance de l'attestation pour l'inscription ${event.enrollmentId}: ${String(error)}`,
      );
    }
  }

  async execute(event: EnrollmentCompletedEvent): Promise<void> {
    const course = await this.coursesFacade.findById(event.courseId);
    if (!isAttestationEligibleCourseType(course.type)) return;

    const existing = await this.attestationRepository.findByEnrollmentId(event.enrollmentId);
    if (existing) return;

    const [learner, tenant, enrollment, progress] = await Promise.all([
      this.usersFacade.findById(event.userId),
      this.tenantsFacade.findById(course.tenantId),
      this.enrollmentsFacade.findById(event.enrollmentId),
      this.enrollmentsFacade.getProgressSummary(event.enrollmentId),
    ]);
    if (!learner || !tenant || !enrollment) {
      this.logger.error(
        `Impossible de délivrer l'attestation pour l'inscription ${event.enrollmentId}: apprenant, tenant ou inscription introuvable.`,
      );
      return;
    }

    const snapshot = enrollment.toSnapshot();
    const issuedAt = new Date();
    const number = buildAttestationNumber(issuedAt, nanoid(8));
    const baseDomain = process.env.APP_BASE_DOMAIN ?? "votredomaine.local";
    const qrVerificationUrl = `https://${tenant.slug}.${baseDomain}/verify-certificate/${number}`;
    const progressPercent =
      progress.totalLessons > 0 ? Math.round((progress.completedLessons / progress.totalLessons) * 100) : 100;
    const endedAt = snapshot.completedAt ?? issuedAt;

    const pdf = await this.pdfRenderer.render({
      learnerName: learner.fullName,
      courseTitle: course.title,
      number,
      issuedAt,
      startedAt: snapshot.startedAt,
      endedAt,
      durationMinutes: course.estimatedDurationMinutes,
      progressPercent,
      qrVerificationUrl,
      locale: snapshot.locale,
    });
    const storageKey = await this.storage.uploadPdf(course.tenantId, number, pdf);

    let attestationId: string;
    try {
      const attestation = await this.attestationRepository.create({
        enrollmentId: event.enrollmentId,
        number,
        learnerNameSnapshot: learner.fullName,
        courseTitleSnapshot: course.title,
        progressPercent,
        durationMinutes: course.estimatedDurationMinutes,
        startedAt: snapshot.startedAt,
        endedAt,
        pdfUrl: storageKey,
        qrVerificationUrl,
      });
      attestationId = attestation.id;
    } catch (error) {
      if (isUniqueViolation(error)) return; // délivrée en parallèle : idempotent
      throw error;
    }

    this.eventEmitter.emit(
      "attestation.issued",
      new AttestationIssuedEvent(attestationId, event.userId, course.title, course.tenantId),
    );
  }
}
