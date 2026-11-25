import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import { mergeLocales, SUPERVISION_MAX_ROWS } from "../domain/supervision";
import type {
  SupervisedCertificate,
  SupervisedCourse,
  SupervisedLearner,
  SupervisedTransaction,
  SupervisionFilter,
} from "../domain/supervision";
import type { SupervisionRepositoryPort } from "../domain/supervision.repository.port";

const TENANT_NAME = { select: { name: true } } as const;

/**
 * Lecture directe des tables Prisma des autres modules : ces listes transverses n'ont pas de raison d'être exposées
 * par les façades métier (même précédent que `analytics.prisma-repository.ts`, section 13.2). Aucune écriture.
 * Les noms de colonnes sensibles (jetons, mots de passe, charges brutes des fournisseurs) ne sont jamais sélectionnés.
 */
@Injectable()
export class SupervisionPrismaRepository implements SupervisionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(filter: SupervisionFilter): Promise<SupervisedCourse[]> {
    const courses = await this.prisma.course.findMany({
      where: { tenantId: filter.tenantId },
      select: {
        id: true,
        title: true,
        tenantId: true,
        tenant: TENANT_NAME,
        status: true,
        type: true,
        sourceLocale: true,
        price: true,
        currency: true,
        createdAt: true,
        locales: { select: { locale: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: SUPERVISION_MAX_ROWS,
    });
    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      tenantId: course.tenantId,
      tenantName: course.tenant.name,
      status: course.status,
      type: course.type,
      locales: mergeLocales(
        course.sourceLocale,
        course.locales.map((entry) => entry.locale),
      ),
      price: course.price,
      currency: course.currency,
      enrollmentsCount: course._count.enrollments,
      createdAt: course.createdAt,
    }));
  }

  async listLearners(filter: SupervisionFilter): Promise<SupervisedLearner[]> {
    const learners = await this.prisma.user.findMany({
      where: { type: "LEARNER", tenantId: filter.tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        tenantId: true,
        tenant: TENANT_NAME,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: SUPERVISION_MAX_ROWS,
    });
    return learners.map((learner) => ({
      id: learner.id,
      fullName: `${learner.firstName} ${learner.lastName}`.trim(),
      email: learner.email,
      tenantId: learner.tenantId,
      tenantName: learner.tenant?.name ?? "—",
      status: learner.status,
      enrollmentsCount: learner._count.enrollments,
      lastLoginAt: learner.lastLoginAt,
      createdAt: learner.createdAt,
    }));
  }

  async listCertificates(filter: SupervisionFilter): Promise<SupervisedCertificate[]> {
    const certificates = await this.prisma.certificate.findMany({
      where: { enrollment: { course: { tenantId: filter.tenantId } } },
      select: {
        number: true,
        status: true,
        learnerNameSnapshot: true,
        courseTitleSnapshot: true,
        scorePercent: true,
        issuedAt: true,
        revokedAt: true,
        enrollment: { select: { course: { select: { tenantId: true, tenant: TENANT_NAME } } } },
      },
      orderBy: { issuedAt: "desc" },
      take: SUPERVISION_MAX_ROWS,
    });
    return certificates.map((certificate) => ({
      number: certificate.number,
      status: certificate.status,
      learnerName: certificate.learnerNameSnapshot,
      courseTitle: certificate.courseTitleSnapshot,
      tenantId: certificate.enrollment.course.tenantId,
      tenantName: certificate.enrollment.course.tenant.name,
      scorePercent: certificate.scorePercent,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
    }));
  }

  async listTransactions(filter: SupervisionFilter): Promise<SupervisedTransaction[]> {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId: filter.tenantId },
      select: {
        id: true,
        type: true,
        method: true,
        status: true,
        tenantId: true,
        tenant: TENANT_NAME,
        providerReference: true,
        amount: true,
        currency: true,
        providerFee: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: SUPERVISION_MAX_ROWS,
    });
    return payments.map((payment) => ({
      id: payment.id,
      type: payment.type,
      method: payment.method,
      status: payment.status,
      tenantId: payment.tenantId,
      tenantName: payment.tenant.name,
      providerReference: payment.providerReference,
      amount: payment.amount,
      currency: payment.currency,
      providerFee: payment.providerFee,
      createdAt: payment.createdAt,
    }));
  }
}
