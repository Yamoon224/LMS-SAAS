import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  AnalyticsRepositoryPort,
  BusinessRawMetrics,
  DateRange,
  PlatformRawMetrics,
} from "../domain/analytics.repository.port";
import type { PlatformTrendsRaw, TrendGranularity } from "../domain/platform-trends";

/**
 * Interroge directement les tables Prisma d'autres modules (course,
 * enrollment, subscription, ledgerEntry...) plutôt que leurs façades — ce
 * module a structurellement besoin d'agrégations transverses qu'aucune
 * façade métier n'a de raison d'exposer (même précédent que
 * PlanQuotaPrismaRepository dans le module plans, section 13.2: une table
 * Prisma est une ressource de persistance partagée, pas un fichier interne
 * d'un module au sens de la règle d'architecture entre code applicatif).
 */
@Injectable()
export class AnalyticsPrismaRepository implements AnalyticsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinessRawMetrics(tenantId: string, range: DateRange): Promise<BusinessRawMetrics> {
    const [
      activeLearnersCount,
      newEnrollmentsCount,
      completedEnrollmentsCount,
      totalRelevantEnrollmentsCount,
      revenueAggregate,
      certificatesIssuedCount,
      topCoursesRaw,
    ] = await Promise.all([
      this.prisma.enrollment.count({
        where: { course: { tenantId }, status: "ACTIVE" },
      }),
      this.prisma.enrollment.count({
        where: { course: { tenantId }, createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.enrollment.count({
        where: {
          course: { tenantId },
          status: "COMPLETED",
          completedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.enrollment.count({
        where: {
          course: { tenantId },
          status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
          createdAt: { lte: range.to },
        },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          tenantId,
          account: "TENANT",
          direction: "CREDIT",
          sourceType: "SALE",
          createdAt: { gte: range.from, lte: range.to },
        },
        _sum: { amount: true },
      }),
      this.prisma.certificate.count({
        where: { enrollment: { course: { tenantId } }, issuedAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.enrollment.groupBy({
        by: ["courseId"],
        where: { course: { tenantId }, createdAt: { gte: range.from, lte: range.to } },
        _count: { courseId: true },
        orderBy: { _count: { courseId: "desc" } },
        take: 5,
      }),
    ]);

    const courseIds = topCoursesRaw.map((row) => row.courseId);
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    });
    const titleById = new Map(courses.map((course) => [course.id, course.title]));

    const grossRevenue = revenueAggregate._sum.amount ?? 0;

    return {
      activeLearnersCount,
      newEnrollmentsCount,
      completedEnrollmentsCount,
      totalRelevantEnrollmentsCount,
      grossRevenue,
      netRevenue: grossRevenue, // la commission est déjà déduite au crédit du compte TENANT (BE-06).
      certificatesIssuedCount,
      topCourses: topCoursesRaw.map((row) => ({
        courseId: row.courseId,
        title: titleById.get(row.courseId) ?? "",
        enrollmentsCount: row._count.courseId,
      })),
    };
  }

  async getPlatformTrendsRaw(range: DateRange, granularity: TrendGranularity): Promise<PlatformTrendsRaw> {
    // `granularity` ne vient jamais de l'utilisateur (day | month) : Prisma.raw est sûr ici.
    const unit = Prisma.raw(granularity === "month" ? "'month'" : "'day'");
    const bucketOf = (column: Prisma.Sql) =>
      Prisma.sql`to_char(date_trunc(${unit}, ${column} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;

    const [tenants, enrollments, certificates, commissions, tenantsByStatus, subscriptionsByStatus] =
      await Promise.all([
        this.prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
          SELECT ${bucketOf(Prisma.sql`created_at`)} AS bucket, COUNT(*) AS count
          FROM tenants WHERE created_at >= ${range.from} AND created_at <= ${range.to} GROUP BY 1`,
        this.prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
          SELECT ${bucketOf(Prisma.sql`created_at`)} AS bucket, COUNT(*) AS count
          FROM enrollments WHERE created_at >= ${range.from} AND created_at <= ${range.to} GROUP BY 1`,
        this.prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
          SELECT ${bucketOf(Prisma.sql`issued_at`)} AS bucket, COUNT(*) AS count
          FROM certificates WHERE issued_at >= ${range.from} AND issued_at <= ${range.to} GROUP BY 1`,
        this.prisma.$queryRaw<{ bucket: string; amount: bigint }[]>`
          SELECT ${bucketOf(Prisma.sql`created_at`)} AS bucket, COALESCE(SUM(amount), 0) AS amount
          FROM ledger_entries
          WHERE account = 'PLATFORM'::"LedgerAccount" AND direction = 'CREDIT'::"LedgerDirection"
            AND source_type IN ('COMMISSION'::"LedgerSourceType", 'OFFLINE_COMMISSION'::"LedgerSourceType")
            AND created_at >= ${range.from} AND created_at <= ${range.to}
          GROUP BY 1`,
        this.prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      ]);

    return {
      tenants: tenants.map((row) => ({ bucket: row.bucket, count: Number(row.count) })),
      enrollments: enrollments.map((row) => ({ bucket: row.bucket, count: Number(row.count) })),
      certificates: certificates.map((row) => ({ bucket: row.bucket, count: Number(row.count) })),
      commissions: commissions.map((row) => ({ bucket: row.bucket, amount: Number(row.amount) })),
      tenantsByStatus: tenantsByStatus.map((row) => ({ status: row.status, count: row._count._all })),
      subscriptionsByStatus: subscriptionsByStatus.map((row) => ({ status: row.status, count: row._count._all })),
    };
  }

  async getPlatformRawMetrics(range: DateRange): Promise<PlatformRawMetrics> {
    const [
      activeTenantsCount,
      newTenantsCount,
      canceledSubscriptionsCount,
      activeSubscriptionsAtPeriodStartCount,
      activeSubscriptions,
      totalLearnersCount,
      totalCoursesCount,
      commissionAggregate,
      trialingTenantsCount,
      suspendedTenantsCount,
      creditRevenueAggregate,
      certificatesIssuedCount,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { status: "ACTIVE" } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      this.prisma.subscription.count({
        where: { status: "CANCELED", canceledAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.subscription.count({
        where: { status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] }, createdAt: { lte: range.from } },
      }),
      this.prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } },
        select: { planPrice: { select: { amount: true, period: true } } },
      }),
      this.prisma.user.count({ where: { type: "LEARNER", status: "ACTIVE" } }),
      this.prisma.course.count({ where: { status: { not: "ARCHIVED" } } }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          account: "PLATFORM",
          direction: "CREDIT",
          sourceType: { in: ["COMMISSION", "OFFLINE_COMMISSION"] },
          createdAt: { gte: range.from, lte: range.to },
        },
        _sum: { amount: true },
      }),
      // Entreprises distinctes en essai (une entreprise = un seul abonnement TRIALING à la fois).
      this.prisma.subscription.count({ where: { status: "TRIALING" } }),
      this.prisma.tenant.count({ where: { status: "SUSPENDED" } }),
      this.prisma.payment.aggregate({
        where: { type: "CREDIT_PURCHASE", status: "SUCCEEDED", createdAt: { gte: range.from, lte: range.to } },
        _sum: { amount: true },
      }),
      this.prisma.certificate.count({ where: { issuedAt: { gte: range.from, lte: range.to } } }),
    ]);

    return {
      activeTenantsCount,
      newTenantsCount,
      canceledSubscriptionsCount,
      activeSubscriptionsAtPeriodStartCount,
      activeSubscriptionAmounts: activeSubscriptions.map((subscription) => ({
        amount: subscription.planPrice.amount,
        period: subscription.planPrice.period,
      })),
      totalLearnersCount,
      totalCoursesCount,
      platformCommissionRevenue: commissionAggregate._sum.amount ?? 0,
      trialingTenantsCount,
      suspendedTenantsCount,
      creditRevenue: creditRevenueAggregate._sum.amount ?? 0,
      certificatesIssuedCount,
    };
  }
}
