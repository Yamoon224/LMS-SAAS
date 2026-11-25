import { describe, expect, it } from "vitest";

import {
  formatQuotaValue,
  humanizeAuditAction,
  quotaTone,
  tenantFinancesSchema,
  tenantOverviewSchema,
} from "./tenant-overview.schema";

const subscription = {
  id: "s1",
  planName: "Pro",
  period: "MONTHLY",
  amount: 25000,
  currency: "XOF",
  status: "ACTIVE",
  autoRenew: true,
  startedAt: "2026-10-01T00:00:00.000Z",
  currentPeriodEnd: "2026-11-01T00:00:00.000Z",
  graceEndsAt: null,
  canceledAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
};

describe("tenantOverviewSchema", () => {
  const payload = {
    tenant: {
      id: "t1",
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
      createdAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null,
    },
    branding: { logoUrl: null, primaryColor: "#112233", bannerUrl: null, description: null },
    contacts: [],
    subscription: { current: subscription, history: [subscription] },
    usage: {
      quotas: [{ key: "maxCourses", label: "Formations", limit: 10, used: 8, unit: null, percent: 80 }],
      courses: 8,
      publishedCourses: 5,
      activeLearners: 12,
      totalLearners: 30,
      creditsBalance: 0,
      lastActivityAt: null,
    },
  };

  it("accepte la réponse de GET /admin/tenants/:id/overview et convertit les dates", () => {
    const parsed = tenantOverviewSchema.parse(payload);
    expect(parsed.tenant.createdAt).toBeInstanceOf(Date);
    expect(parsed.subscription.current?.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it("accepte une entreprise sans abonnement", () => {
    const parsed = tenantOverviewSchema.parse({ ...payload, subscription: { current: null, history: [] } });
    expect(parsed.subscription.current).toBeNull();
  });
});

describe("tenantFinancesSchema", () => {
  it("accepte des listes vides", () => {
    const parsed = tenantFinancesSchema.parse({
      summary: { currency: "XOF", ledgerBalance: 0, succeededPaymentsAmount: 0, failedPaymentsCount: 0, executedPayoutsAmount: 0, refundedAmount: 0 },
      payments: [],
      payouts: [],
      refunds: [],
    });
    expect(parsed.payments).toEqual([]);
  });
});

describe("quotaTone", () => {
  it("illimité sans pourcentage, vert sous 80 %, orange dès 80 %, rouge dès 100 %", () => {
    expect(quotaTone(null)).toBe("unlimited");
    expect(quotaTone(79)).toBe("ok");
    expect(quotaTone(80)).toBe("warning");
    expect(quotaTone(99)).toBe("warning");
    expect(quotaTone(100)).toBe("danger");
    expect(quotaTone(140)).toBe("danger");
  });
});

describe("formatQuotaValue", () => {
  it("affiche usage / limite avec l'unité éventuelle", () => {
    expect(formatQuotaValue({ used: 8, limit: 10, unit: null })).toBe("8 / 10");
    expect(formatQuotaValue({ used: 1.5, limit: 3, unit: "Go" })).toBe("1,5 / 3 Go");
  });

  it("signale un quota illimité", () => {
    expect(formatQuotaValue({ used: 4, limit: null, unit: null })).toBe("4 (illimité)");
  });
});

describe("humanizeAuditAction", () => {
  it("remplace points et tirets bas par des espaces et met la première lettre en capitale", () => {
    expect(humanizeAuditAction("tenant.suspended")).toBe("Tenant suspended");
    expect(humanizeAuditAction("payout_approved")).toBe("Payout approved");
  });
});
