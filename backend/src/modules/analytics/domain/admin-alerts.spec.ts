import {
  AI_ANOMALY_BASELINE_DAYS,
  AI_ANOMALY_FACTOR,
  AI_ANOMALY_MIN_CREDITS,
  buildAdminAlerts,
  detectAiAnomalies,
  FAILED_PAYMENTS_CRITICAL_THRESHOLD,
  MEDIA_FAILED_CRITICAL_THRESHOLD,
  PENDING_PAYOUT_CRITICAL_AGE_DAYS,
  PENDING_REFUND_CRITICAL_AGE_DAYS,
  SUBSCRIPTIONS_EXPIRED_CRITICAL_THRESHOLD,
  WEBHOOK_FAILURES_CRITICAL_THRESHOLD,
} from "./admin-alerts";
import type { RawAdminAlerts, RawAiTenantUsage } from "./admin-alerts";

const NOW = new Date("2026-11-19T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

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

const severityOf = (raw: Partial<RawAdminAlerts>, type: string) =>
  buildAdminAlerts({ ...none(), ...raw }, NOW).find((alert) => alert.type === type)?.severity;

describe("buildAdminAlerts", () => {
  it("ne produit aucune alerte quand tous les compteurs sont à zéro", () => {
    expect(buildAdminAlerts(none(), NOW)).toEqual([]);
  });

  it("paiements échoués : avertissement sous le seuil, critique au seuil", () => {
    expect(severityOf({ failedPayments: FAILED_PAYMENTS_CRITICAL_THRESHOLD - 1 }, "FAILED_PAYMENTS")).toBe("WARNING");
    expect(severityOf({ failedPayments: FAILED_PAYMENTS_CRITICAL_THRESHOLD }, "FAILED_PAYMENTS")).toBe("CRITICAL");
  });

  it("abonnements expirés : avertissement puis critique ; grâce : avertissement ; échéance proche : information", () => {
    expect(severityOf({ subscriptionsExpiredRecently: 1 }, "SUBSCRIPTIONS_EXPIRED")).toBe("WARNING");
    expect(
      severityOf({ subscriptionsExpiredRecently: SUBSCRIPTIONS_EXPIRED_CRITICAL_THRESHOLD }, "SUBSCRIPTIONS_EXPIRED"),
    ).toBe("CRITICAL");
    expect(severityOf({ subscriptionsInGrace: 3 }, "SUBSCRIPTIONS_GRACE")).toBe("WARNING");
    expect(severityOf({ subscriptionsExpiringSoon: 3 }, "SUBSCRIPTIONS_EXPIRING")).toBe("INFO");
  });

  it("reversements en attente : critique quand le plus ancien atteint le seuil d'ancienneté", () => {
    const recent = { count: 2, oldestAt: daysAgo(PENDING_PAYOUT_CRITICAL_AGE_DAYS - 1) };
    const old = { count: 2, oldestAt: daysAgo(PENDING_PAYOUT_CRITICAL_AGE_DAYS) };
    expect(severityOf({ pendingPayouts: recent }, "PAYOUTS_PENDING")).toBe("WARNING");
    expect(severityOf({ pendingPayouts: old }, "PAYOUTS_PENDING")).toBe("CRITICAL");
  });

  it("remboursements à traiter : même logique d'ancienneté", () => {
    expect(
      severityOf({ pendingRefunds: { count: 1, oldestAt: daysAgo(PENDING_REFUND_CRITICAL_AGE_DAYS - 1) } }, "REFUNDS_PENDING"),
    ).toBe("WARNING");
    expect(
      severityOf({ pendingRefunds: { count: 1, oldestAt: daysAgo(PENDING_REFUND_CRITICAL_AGE_DAYS + 2) } }, "REFUNDS_PENDING"),
    ).toBe("CRITICAL");
  });

  it("entreprises suspendues : information avec lien vers les entreprises", () => {
    const alert = buildAdminAlerts({ ...none(), suspendedTenants: 2 }, NOW)[0];
    expect(alert).toMatchObject({ type: "TENANTS_SUSPENDED", severity: "INFO", count: 2, href: "/tenants" });
  });

  it("webhooks en échec et médias en échec : seuils critiques", () => {
    expect(severityOf({ webhookFailures: WEBHOOK_FAILURES_CRITICAL_THRESHOLD - 1 }, "WEBHOOK_FAILURES")).toBe("WARNING");
    expect(severityOf({ webhookFailures: WEBHOOK_FAILURES_CRITICAL_THRESHOLD }, "WEBHOOK_FAILURES")).toBe("CRITICAL");
    expect(severityOf({ mediaAnalysisFailed: MEDIA_FAILED_CRITICAL_THRESHOLD - 1 }, "MEDIA_ANALYSIS_FAILED")).toBe("WARNING");
    expect(severityOf({ mediaAnalysisFailed: MEDIA_FAILED_CRITICAL_THRESHOLD }, "MEDIA_ANALYSIS_FAILED")).toBe("CRITICAL");
  });

  it("accorde le singulier et le pluriel dans le détail", () => {
    const [one] = buildAdminAlerts({ ...none(), failedPayments: 1 }, NOW);
    const [many] = buildAdminAlerts({ ...none(), failedPayments: 4 }, NOW);
    expect(one?.detail).toContain("1 paiement a échoué");
    expect(many?.detail).toContain("4 paiements ont échoué");
  });

  it("trie par sévérité (critique d'abord) puis par compteur décroissant", () => {
    const alerts = buildAdminAlerts(
      {
        ...none(),
        suspendedTenants: 50, // INFO
        subscriptionsInGrace: 2, // WARNING
        failedPayments: FAILED_PAYMENTS_CRITICAL_THRESHOLD, // CRITICAL
        webhookFailures: 3, // WARNING
      },
      NOW,
    );
    expect(alerts.map((alert) => alert.type)).toEqual([
      "FAILED_PAYMENTS",
      "WEBHOOK_FAILURES",
      "SUBSCRIPTIONS_GRACE",
      "TENANTS_SUSPENDED",
    ]);
  });

  it("chaque alerte porte type, sévérité, titre, détail, compteur et lien", () => {
    const alerts = buildAdminAlerts(
      {
        failedPayments: 1,
        subscriptionsExpiringSoon: 1,
        subscriptionsInGrace: 1,
        subscriptionsExpiredRecently: 1,
        pendingPayouts: { count: 1, oldestAt: daysAgo(0) },
        pendingRefunds: { count: 1, oldestAt: daysAgo(0) },
        suspendedTenants: 1,
        webhookFailures: 1,
        aiUsage: [{ tenantId: "t", tenantName: "Acme", recentCredits: AI_ANOMALY_MIN_CREDITS, baselineCredits: 0 }],
        mediaAnalysisFailed: 1,
      },
      NOW,
    );
    expect(alerts).toHaveLength(10);
    for (const alert of alerts) {
      expect(alert.title).not.toBe("");
      expect(alert?.detail).not.toBe("");
      expect(alert.count).toBeGreaterThan(0);
      expect(alert.href.startsWith("/")).toBe(true);
    }
  });
});

describe("detectAiAnomalies", () => {
  const usage = (recentCredits: number, baselineCredits: number, tenantName = "Acme"): RawAiTenantUsage => ({
    tenantId: tenantName,
    tenantName,
    recentCredits,
    baselineCredits,
  });

  it("ignore une consommation sous le plancher, même très supérieure à la moyenne", () => {
    expect(detectAiAnomalies([usage(AI_ANOMALY_MIN_CREDITS - 1, 0)])).toEqual([]);
  });

  it("sans historique, le plancher seul suffit", () => {
    expect(detectAiAnomalies([usage(AI_ANOMALY_MIN_CREDITS, 0)])).toHaveLength(1);
  });

  it("exige le facteur multiplicatif sur la moyenne quotidienne de référence", () => {
    const dailyAverage = 2000;
    const baseline = dailyAverage * AI_ANOMALY_BASELINE_DAYS;
    expect(detectAiAnomalies([usage(dailyAverage * AI_ANOMALY_FACTOR - 1, baseline)])).toEqual([]);
    expect(detectAiAnomalies([usage(dailyAverage * AI_ANOMALY_FACTOR, baseline)])).toHaveLength(1);
  });

  it("classe les plus fortes consommations d'abord et nomme au plus trois entreprises dans l'alerte", () => {
    const rows = ["A", "B", "C", "D"].map((name, index) => usage(AI_ANOMALY_MIN_CREDITS * (index + 1), 0, name));
    expect(detectAiAnomalies(rows).map((row) => row.tenantName)).toEqual(["D", "C", "B", "A"]);

    const [alert] = buildAdminAlerts({ ...none(), aiUsage: rows }, NOW);
    expect(alert).toMatchObject({ type: "AI_CONSUMPTION_ANOMALY", severity: "WARNING", count: 4 });
    expect(alert?.detail).toContain("D, C, B et 1 autre");
  });
});
