import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import { anonymizedIdentity, DELETED_ACCOUNT_NAME } from "../domain/anonymized-identity";
import type { LearnerDataExport } from "../domain/learner-data-export";
import type {
  DeletionBlockers,
  PrivacyAccount,
  PrivacyRepositoryPort,
} from "../domain/privacy.repository.port";

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);

function fetchUser(prisma: PrismaService, userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      locale: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
    },
  });
}

function fetchEnrollments(prisma: PrismaService, userId: string) {
  return prisma.enrollment.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      pricePaid: true,
      currency: true,
      paymentMethod: true,
      startedAt: true,
      expiresAt: true,
      completedAt: true,
      createdAt: true,
      course: { select: { title: true } },
      progress: {
        select: {
          state: true,
          watchedPercent: true,
          opened: true,
          startedAt: true,
          completedAt: true,
          lesson: { select: { title: true } },
        },
      },
      attempts: {
        select: { quizId: true, status: true, scorePercent: true, answers: true, startedAt: true, submittedAt: true },
      },
      certificate: {
        select: {
          number: true,
          status: true,
          courseTitleSnapshot: true,
          learnerNameSnapshot: true,
          scorePercent: true,
          issuedAt: true,
          revokedAt: true,
        },
      },
      payment: {
        select: {
          enrollmentId: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          providerReference: true,
          createdAt: true,
          refunds: { select: { amount: true, reason: true, status: true, requestedAt: true, resolvedAt: true } },
        },
      },
    },
  });
}

function fetchSecondary(prisma: PrismaService, userId: string) {
  return Promise.all([
    prisma.legalAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: "asc" },
      select: { acceptedAt: true, document: { select: { type: true, version: true, title: true } } },
    }),
    prisma.attendance.findMany({
      where: { userId },
      select: { attended: true, joinedAt: true, leftAt: true, liveSession: { select: { title: true } } },
    }),
    // Le contenu (`payload`) est exclu : il peut contenir des liens à usage unique (activation, réinitialisation).
    prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: "asc" },
      select: { channel: true, templateKey: true, status: true, createdAt: true, sentAt: true, readAt: true },
    }),
  ]);
}

type UserRow = NonNullable<Awaited<ReturnType<typeof fetchUser>>>;
type EnrollmentRows = Awaited<ReturnType<typeof fetchEnrollments>>;
type SecondaryRows = Awaited<ReturnType<typeof fetchSecondary>>;

function mapAcademic(enrollments: EnrollmentRows) {
  return {
    enrollments: enrollments.map((e) => ({
      id: e.id,
      courseTitle: e.course.title,
      status: e.status,
      pricePaid: e.pricePaid,
      currency: e.currency,
      paymentMethod: e.paymentMethod,
      startedAt: iso(e.startedAt),
      expiresAt: iso(e.expiresAt),
      completedAt: iso(e.completedAt),
      createdAt: e.createdAt.toISOString(),
    })),
    progress: enrollments.flatMap((e) =>
      e.progress.map((p) => ({
        enrollmentId: e.id,
        lessonTitle: p.lesson.title,
        state: p.state,
        watchedPercent: p.watchedPercent,
        opened: p.opened,
        startedAt: iso(p.startedAt),
        completedAt: iso(p.completedAt),
      })),
    ),
    assessmentAttempts: enrollments.flatMap((e) =>
      e.attempts.map((a) => ({
        enrollmentId: e.id,
        kind: a.quizId ? ("QUIZ" as const) : ("EXAM" as const),
        status: a.status,
        scorePercent: a.scorePercent,
        answers: a.answers,
        startedAt: a.startedAt.toISOString(),
        submittedAt: iso(a.submittedAt),
      })),
    ),
    certificates: enrollments.flatMap((e) =>
      e.certificate
        ? [
            {
              number: e.certificate.number,
              status: e.certificate.status,
              courseTitle: e.certificate.courseTitleSnapshot,
              holderName: e.certificate.learnerNameSnapshot,
              scorePercent: e.certificate.scorePercent,
              issuedAt: e.certificate.issuedAt.toISOString(),
              revokedAt: iso(e.certificate.revokedAt),
            },
          ]
        : [],
    ),
  };
}

function mapPurchases(enrollments: EnrollmentRows): LearnerDataExport["purchases"] {
  return enrollments.flatMap((e) =>
    e.payment
      ? [
          {
            enrollmentId: e.payment.enrollmentId,
            amount: e.payment.amount,
            currency: e.payment.currency,
            method: e.payment.method,
            status: e.payment.status,
            reference: e.payment.providerReference,
            createdAt: e.payment.createdAt.toISOString(),
            refunds: e.payment.refunds.map((r) => ({
              amount: r.amount,
              reason: r.reason,
              status: r.status,
              requestedAt: r.requestedAt.toISOString(),
              resolvedAt: iso(r.resolvedAt),
            })),
          },
        ]
      : [],
  );
}

function mapSecondary([acceptances, attendances, notifications]: SecondaryRows) {
  return {
    legalAcceptances: acceptances.map((a) => ({
      documentType: a.document.type,
      version: a.document.version,
      title: a.document.title,
      acceptedAt: a.acceptedAt.toISOString(),
    })),
    liveSessionAttendances: attendances.map((a) => ({
      liveSessionTitle: a.liveSession.title,
      attended: a.attended,
      joinedAt: iso(a.joinedAt),
      leftAt: iso(a.leftAt),
    })),
    notifications: notifications.map((n) => ({
      channel: n.channel,
      templateKey: n.templateKey,
      status: n.status,
      createdAt: n.createdAt.toISOString(),
      sentAt: iso(n.sentAt),
      readAt: iso(n.readAt),
    })),
  };
}

function mapProfile(user: UserRow): LearnerDataExport["profile"] {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: iso(user.lastLoginAt),
    emailVerifiedAt: iso(user.emailVerifiedAt),
  };
}

/**
 * Lecture et écriture directes des tables Prisma (même précédent documenté que `analytics.prisma-repository.ts`) :
 * l'export et l'anonymisation traversent par nature plusieurs modules et doivent être atomiques.
 * Toute requête est bornée par l'identifiant du demandeur (`userId` venu du jeton), jamais par une entrée libre.
 */
@Injectable()
export class PrivacyPrismaRepository implements PrivacyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAccount(userId: string): Promise<PrivacyAccount | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, type: true, passwordHash: true, anonymizedAt: true },
    });
  }

  async collectLearnerData(userId: string, exportedAt: Date): Promise<LearnerDataExport | null> {
    const user = await fetchUser(this.prisma, userId);
    if (!user) return null;
    const enrollments = await fetchEnrollments(this.prisma, userId);
    const secondary = await fetchSecondary(this.prisma, userId);
    return {
      exportedAt: exportedAt.toISOString(),
      profile: mapProfile(user),
      ...mapAcademic(enrollments),
      purchases: mapPurchases(enrollments),
      ...mapSecondary(secondary),
    };
  }

  async findDeletionBlockers(userId: string): Promise<DeletionBlockers> {
    const [pendingPayments, openRefunds] = await Promise.all([
      this.prisma.payment.count({ where: { status: "PENDING", enrollment: { userId } } }),
      this.prisma.refund.count({
        where: { status: { in: ["REQUESTED", "ACCEPTED"] }, payment: { enrollment: { userId } } },
      }),
    ]);
    return { pendingPayments, openRefunds };
  }

  async anonymizeLearner(userId: string, now: Date): Promise<boolean> {
    const identity = anonymizedIdentity(userId);
    return this.prisma.$transaction(async (tx) => {
      // Garde atomique : seule la première exécution (apprenant, pas encore anonymisé) modifie la ligne.
      const updated = await tx.user.updateMany({
        where: { id: userId, type: "LEARNER", anonymizedAt: null },
        data: {
          firstName: identity.firstName,
          lastName: identity.lastName,
          email: identity.email,
          phone: null,
          passwordHash: null,
          twoFactorSecret: null,
          twoFactorEnabled: false,
          status: "DEACTIVATED",
          anonymizedAt: now,
        },
      });
      if (updated.count === 0) return false;

      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
      await tx.invitationToken.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { recipientUserId: userId } });
      // RG-14 : le nom figé à la délivrance est remplacé ; numéro, statut et score du certificat sont conservés.
      await tx.certificate.updateMany({
        where: { enrollment: { userId } },
        data: { learnerNameSnapshot: DELETED_ACCOUNT_NAME },
      });
      return true;
    });
  }

  async deleteReadNotificationsBefore(cutoff: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({ where: { readAt: { lt: cutoff } } });
    return result.count;
  }

  async listInactiveLearnerIds(cutoff: Date, limit: number): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        type: "LEARNER",
        anonymizedAt: null,
        createdAt: { lt: cutoff },
        OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: cutoff } }],
        // Aucune session ouverte (connexion ou rafraîchissement) ni mouvement d'inscription depuis `cutoff`.
        refreshTokens: { none: { createdAt: { gte: cutoff } } },
        enrollments: { none: { updatedAt: { gte: cutoff } } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true },
    });
    return users.map((user) => user.id);
  }
}
