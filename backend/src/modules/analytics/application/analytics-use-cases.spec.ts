import type { NotificationsFacade } from "@modules/notifications/notifications.facade";
import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { RawAdminAlerts } from "../domain/admin-alerts";
import type { AdminAlertsRepositoryPort } from "../domain/admin-alerts.repository.port";
import type { AnalyticsRepositoryPort, BusinessRawMetrics, PlatformRawMetrics } from "../domain/analytics.repository.port";
import type {
  TenantContact,
  TenantFinances,
  TenantProfile,
  TenantSubscriptionRow,
  TenantUsageCounts,
} from "../domain/tenant-overview";
import type { TenantOverviewRepositoryPort } from "../domain/tenant-overview.repository.port";

import { GetAdminAlertsUseCase } from "./get-admin-alerts.use-case";
import { GetBusinessDashboardUseCase } from "./get-business-dashboard.use-case";
import { GetPlatformDashboardUseCase } from "./get-platform-dashboard.use-case";
import { GetTenantOverviewUseCase } from "./get-tenant-overview.use-case";

const NOW = new Date("2026-11-19T12:00:00Z");
const RANGE = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-30T23:59:59Z") };

describe("GetPlatformDashboardUseCase", () => {
  const raw = (over: Partial<PlatformRawMetrics> = {}): PlatformRawMetrics => ({
    activeTenantsCount: 12,
    newTenantsCount: 3,
    canceledSubscriptionsCount: 1,
    activeSubscriptionsAtPeriodStartCount: 8,
    activeSubscriptionAmounts: [
      { amount: 30_000, period: "MONTHLY" },
      { amount: 90_000, period: "QUARTERLY" },
      { amount: 120_000, period: "YEARLY" },
    ],
    totalLearnersCount: 450,
    totalCoursesCount: 37,
    platformCommissionRevenue: 82_000,
    trialingTenantsCount: 2,
    suspendedTenantsCount: 1,
    creditRevenue: 15_000,
    certificatesIssuedCount: 64,
    ...over,
  });

  function build(metrics: PlatformRawMetrics) {
    const repo = { getPlatformRawMetrics: jest.fn().mockResolvedValue(metrics) };
    return { repo, useCase: new GetPlatformDashboardUseCase(repo as unknown as AnalyticsRepositoryPort) };
  }

  it("calcule MRR normalisé au mois, ARR, churn et recopie les compteurs", async () => {
    const { repo, useCase } = build(raw());
    const dashboard = await useCase.execute(RANGE);
    expect(repo.getPlatformRawMetrics).toHaveBeenCalledWith(RANGE);
    // 30 000 + 90 000 / 3 + 120 000 / 12 = 70 000
    expect(dashboard.monthlyRecurringRevenue).toBe(70_000);
    expect(dashboard.annualRecurringRevenue).toBe(840_000);
    expect(dashboard.churnRatePercent).toBe(12.5);
    expect(dashboard).toMatchObject({
      periodStart: RANGE.from,
      periodEnd: RANGE.to,
      activeTenantsCount: 12,
      newTenantsCount: 3,
      totalLearnersCount: 450,
      totalCoursesCount: 37,
      platformCommissionRevenue: 82_000,
      trialingTenantsCount: 2,
      suspendedTenantsCount: 1,
      creditRevenue: 15_000,
      certificatesIssuedCount: 64,
      currency: "XOF",
    });
  });

  it("arrondit le MRR à l'unité et calcule l'ARR à partir du MRR arrondi", async () => {
    const { useCase } = build(raw({ activeSubscriptionAmounts: [{ amount: 100, period: "QUARTERLY" }] }));
    const dashboard = await useCase.execute(RANGE);
    // 100 / 3 = 33,33 -> 33 ; ARR = 33 * 12
    expect(dashboard.monthlyRecurringRevenue).toBe(33);
    expect(dashboard.annualRecurringRevenue).toBe(396);
  });

  it("renvoie un churn nul sans abonnement en début de période et un MRR nul sans abonnement", async () => {
    const { useCase } = build(raw({ activeSubscriptionsAtPeriodStartCount: 0, activeSubscriptionAmounts: [] }));
    const dashboard = await useCase.execute(RANGE);
    expect(dashboard.churnRatePercent).toBe(0);
    expect(dashboard.monthlyRecurringRevenue).toBe(0);
    expect(dashboard.annualRecurringRevenue).toBe(0);
  });
});

describe("GetBusinessDashboardUseCase", () => {
  const raw = (over: Partial<BusinessRawMetrics> = {}): BusinessRawMetrics => ({
    activeLearnersCount: 40,
    newEnrollmentsCount: 15,
    completedEnrollmentsCount: 7,
    totalRelevantEnrollmentsCount: 21,
    grossRevenue: 500_000,
    netRevenue: 420_000,
    certificatesIssuedCount: 5,
    topCourses: [{ courseId: "c1", title: "Excel", enrollmentsCount: 9 }],
    ...over,
  });

  it("expose les revenus bruts/nets, le taux de complétion arrondi à 2 décimales et les formations phares", async () => {
    const repo = { getBusinessRawMetrics: jest.fn().mockResolvedValue(raw()) };
    const dashboard = await new GetBusinessDashboardUseCase(repo as unknown as AnalyticsRepositoryPort).execute("tenant-1", RANGE);
    expect(repo.getBusinessRawMetrics).toHaveBeenCalledWith("tenant-1", RANGE);
    expect(dashboard).toEqual({
      tenantId: "tenant-1",
      periodStart: RANGE.from,
      periodEnd: RANGE.to,
      activeLearnersCount: 40,
      newEnrollmentsCount: 15,
      completedEnrollmentsCount: 7,
      completionRatePercent: 33.33,
      grossRevenue: 500_000,
      netRevenue: 420_000,
      currency: "XOF",
      certificatesIssuedCount: 5,
      topCourses: [{ courseId: "c1", title: "Excel", enrollmentsCount: 9 }],
    });
  });

  it("renvoie un taux de complétion nul sans inscription pertinente", async () => {
    const repo = { getBusinessRawMetrics: jest.fn().mockResolvedValue(raw({ totalRelevantEnrollmentsCount: 0, completedEnrollmentsCount: 0 })) };
    const dashboard = await new GetBusinessDashboardUseCase(repo as unknown as AnalyticsRepositoryPort).execute("tenant-1", RANGE);
    expect(dashboard.completionRatePercent).toBe(0);
  });
});

describe("GetAdminAlertsUseCase", () => {
  const none = (): RawAdminAlerts => ({
    failedPayments: 0,
    subscriptionsExpiringSoon: 0,
    subscriptionsInGrace: 0,
    subscriptionsExpiredRecently: 0,
    pendingPayouts: { count: 0, oldestAt: null },
    pendingRefunds: { count: 0, oldestAt: null },
    suspendedTenants: 0,
    webhookFailures: 0,
    aiUsage: [],
    mediaAnalysisFailed: 0,
  });

  it("renvoie un rapport vide sans alerte", async () => {
    const repo = { getRawAlerts: jest.fn().mockResolvedValue(none()) };
    const report = await new GetAdminAlertsUseCase(repo as unknown as AdminAlertsRepositoryPort).execute(NOW);
    expect(repo.getRawAlerts).toHaveBeenCalledWith(NOW);
    expect(report).toEqual({ generatedAt: NOW, criticalCount: 0, alerts: [] });
  });

  it("compte les alertes critiques et trie les critiques en premier", async () => {
    const repo = { getRawAlerts: jest.fn().mockResolvedValue({ ...none(), suspendedTenants: 2, failedPayments: 10, webhookFailures: 12 }) };
    const report = await new GetAdminAlertsUseCase(repo as unknown as AdminAlertsRepositoryPort).execute(NOW);
    expect(report.criticalCount).toBe(2);
    expect(report.alerts.map((a) => a.severity).slice(0, 2)).toEqual(["CRITICAL", "CRITICAL"]);
    expect(report.alerts.map((a) => a.type)).toEqual(expect.arrayContaining(["FAILED_PAYMENTS", "WEBHOOK_FAILURES", "TENANTS_SUSPENDED"]));
    expect(report.alerts).toHaveLength(3);
  });

  it("utilise la date courante par défaut", async () => {
    const repo = { getRawAlerts: jest.fn().mockResolvedValue(none()) };
    const report = await new GetAdminAlertsUseCase(repo as unknown as AdminAlertsRepositoryPort).execute();
    expect(report.generatedAt).toBeInstanceOf(Date);
  });
});

describe("GetTenantOverviewUseCase (ADM-10)", () => {
  const profile: TenantProfile = {
    id: "tenant-1",
    name: "Acme",
    slug: "acme",
    status: "ACTIVE",
    statusReason: null,
    country: "CI",
    currency: "XOF",
    defaultLocale: "fr",
    contactEmail: null,
    contactPhone: null,
    offlinePaymentEnabled: false,
    payoutAccountVerified: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    archivedAt: null,
  };
  const owner: TenantContact = { id: "u1", fullName: "Awa", email: "awa@acme.test", phone: null, status: "ACTIVE" };
  const row = (id: string, status: TenantSubscriptionRow["status"], quotas: unknown = null): TenantSubscriptionRow => ({
    id,
    planName: `Plan ${id}`,
    period: "MONTHLY",
    amount: 25_000,
    currency: "XOF",
    status,
    autoRenew: true,
    startedAt: null,
    currentPeriodEnd: null,
    graceEndsAt: null,
    canceledAt: null,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    discountPercent: null,
    discountAmount: null,
    discountPeriodsRemaining: null,
    isComplimentary: false,
    quotas,
  });
  const usage: TenantUsageCounts = {
    courses: 5,
    publishedCourses: 3,
    activeLearners: 20,
    totalLearners: 35,
    managers: 2,
    storageBytes: 2 * 1024 * 1024 * 1024,
    liveSessionsThisMonth: 1,
    creditsBalance: 800,
    lastActivityAt: new Date("2026-11-18T00:00:00Z"),
  };

  function build(over: { profile?: TenantProfile | null; subscriptions?: TenantSubscriptionRow[]; branding?: unknown } = {}) {
    const repo = {
      findProfile: jest.fn().mockResolvedValue(over.profile === undefined ? profile : over.profile),
      findOwners: jest.fn().mockResolvedValue([owner]),
      listSubscriptions: jest.fn().mockResolvedValue(over.subscriptions ?? []),
      getUsageCounts: jest.fn().mockResolvedValue(usage),
      listUsers: jest.fn().mockResolvedValue([{ id: "u1" }]),
      getFinances: jest.fn().mockResolvedValue({ summary: { ledgerBalance: 1 } } as unknown as TenantFinances),
      listAudit: jest.fn().mockResolvedValue([{ id: "a1" }]),
    };
    const tenants = {
      findById: jest.fn().mockResolvedValue(over.branding === undefined ? { publicBranding: { logoUrl: "https://logo", primaryColor: "#fff", bannerUrl: null, description: "d" } } : over.branding),
    };
    return {
      repo,
      tenants,
      useCase: new GetTenantOverviewUseCase(repo as unknown as TenantOverviewRepositoryPort, tenants as unknown as TenantsFacade, { render: jest.fn() } as unknown as NotificationsFacade),
    };
  }

  it("assemble profil, image de marque, contacts, abonnement courant, historique et usage avec quotas", async () => {
    const { repo, useCase } = build({
      subscriptions: [row("expired", "EXPIRED"), row("current", "ACTIVE", { maxCourses: 10, storageGb: 2 }), row("old", "ACTIVE")],
    });
    const overview = await useCase.overview("tenant-1", NOW);

    expect(repo.getUsageCounts).toHaveBeenCalledWith("tenant-1", NOW);
    expect(repo.listSubscriptions).toHaveBeenCalledWith("tenant-1", 20);
    expect(overview.tenant).toBe(profile);
    expect(overview.contacts).toEqual([owner]);
    expect(overview.branding.logoUrl).toBe("https://logo");
    // l'abonnement courant est le premier (plus récent) à ouvrir des droits ; les quotas bruts ne fuient pas
    expect(overview.subscription.current?.id).toBe("current");
    expect(overview.subscription.current).not.toHaveProperty("quotas");
    expect(overview.subscription.history.map((s) => s.id)).toEqual(["expired", "current", "old"]);
    expect(overview.subscription.history.every((s) => !("quotas" in s))).toBe(true);
    expect(overview.usage).toMatchObject({
      courses: 5,
      publishedCourses: 3,
      activeLearners: 20,
      totalLearners: 35,
      creditsBalance: 800,
      lastActivityAt: usage.lastActivityAt,
    });
    const quotas = Object.fromEntries(overview.usage.quotas.map((q) => [q.key, q]));
    expect(quotas.maxCourses).toMatchObject({ limit: 10, used: 5, percent: 50 });
    expect(quotas.storageGb).toMatchObject({ limit: 2, used: 2, percent: 100, unit: "Go" });
    expect(quotas.maxManagers).toMatchObject({ limit: null, used: 2, percent: null });
  });

  it("sans abonnement courant : current est null et tous les quotas sont illimités", async () => {
    const { useCase } = build({ subscriptions: [row("expired", "EXPIRED")] });
    const overview = await useCase.overview("tenant-1", NOW);
    expect(overview.subscription.current).toBeNull();
    expect(overview.usage.quotas.every((q) => q.limit === null && q.percent === null)).toBe(true);
  });

  it("utilise une image de marque vide quand l'entreprise est introuvable côté façade", async () => {
    const { useCase } = build({ branding: null });
    const overview = await useCase.overview("tenant-1");
    expect(overview.branding).toEqual({ logoUrl: null, primaryColor: null, bannerUrl: null, description: null });
  });

  it("users et audit appliquent leurs plafonds", async () => {
    const { repo, useCase } = build();
    await expect(useCase.users("tenant-1")).resolves.toEqual([{ id: "u1" }]);
    await expect(useCase.audit("tenant-1")).resolves.toEqual([{ id: "a1" }]);
    expect(repo.listUsers).toHaveBeenCalledWith("tenant-1", 200);
    expect(repo.listAudit).toHaveBeenCalledWith("tenant-1", 100);
  });

  it("finances utilise la devise du profil de l'entreprise", async () => {
    const { repo, useCase } = build({ profile: { ...profile, currency: "GNF" } });
    await useCase.finances("tenant-1");
    expect(repo.getFinances).toHaveBeenCalledWith("tenant-1", "GNF", 20);
  });

  it.each(["overview", "users", "finances", "audit"] as const)("%s lève NotFoundDomainError pour une entreprise inconnue", async (method) => {
    const { repo, useCase } = build({ profile: null });
    await expect(useCase[method]("nope")).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(repo.listUsers).not.toHaveBeenCalled();
    expect(repo.getFinances).not.toHaveBeenCalled();
    expect(repo.listAudit).not.toHaveBeenCalled();
  });
});
