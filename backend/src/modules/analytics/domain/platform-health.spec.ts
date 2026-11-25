import {
  assessQueue,
  overallStatus,
  QUEUE_BACKLOG_ALERT,
  summarizeStorage,
  summarizeWebhooks,
  WEBHOOK_MIN_SAMPLE,
} from "./platform-health";
import type { QueueCounts, RawWebhookCount } from "./platform-health";

const counts = (overrides: Partial<QueueCounts> = {}): QueueCounts => ({
  waiting: 0,
  active: 0,
  delayed: 0,
  failed: 0,
  paused: 0,
  ...overrides,
});

describe("assessQueue", () => {
  it("est saine quand rien n'est en échec ni engorgé", () => {
    expect(assessQueue("notifications", counts({ waiting: 3, active: 1 })).status).toBe("HEALTHY");
  });

  it("est dégradée dès qu'une tâche a échoué", () => {
    expect(assessQueue("notifications", counts({ failed: 1 })).status).toBe("DEGRADED");
  });

  it("est dégradée au-delà du seuil d'engorgement, tâches différées comprises", () => {
    expect(assessQueue("notifications", counts({ waiting: QUEUE_BACKLOG_ALERT })).status).toBe("HEALTHY");
    expect(assessQueue("notifications", counts({ waiting: 60, delayed: 41 })).status).toBe("DEGRADED");
  });

  it("signale une file injoignable comme arrêtée plutôt que de supposer qu'elle est vide", () => {
    expect(assessQueue("notifications", null)).toEqual({ name: "notifications", available: false, counts: null, status: "DOWN" });
  });
});

describe("summarizeWebhooks", () => {
  const row = (providerCode: string, outcome: RawWebhookCount["outcome"], count: number): RawWebhookCount => ({
    providerCode,
    outcome,
    count,
  });

  it("n'a pas de données sans événement, ce qui n'est pas une erreur", () => {
    expect(summarizeWebhooks([])).toMatchObject({ total: 0, failed: 0, errorRatePercent: 0, status: "NO_DATA" });
  });

  it("compte signature invalide, référence inconnue et exception comme des erreurs, pas les doublons", () => {
    const health = summarizeWebhooks([
      row("PAYSTACK", "PROCESSED", 90),
      row("PAYSTACK", "DUPLICATE", 6),
      row("PAYSTACK", "INVALID_SIGNATURE", 1),
      row("PAYSTACK", "UNKNOWN_REFERENCE", 1),
      row("PAYSTACK", "ERROR", 2),
    ]);
    expect(health.providers[0]).toMatchObject({ total: 100, failed: 4, errorRatePercent: 4, status: "HEALTHY" });
  });

  it("passe un fournisseur en dégradé à 20 % d'erreurs, à condition d'avoir assez d'événements", () => {
    const degraded = summarizeWebhooks([row("PIXEL", "PROCESSED", 8), row("PIXEL", "ERROR", 2)]);
    expect(degraded.providers[0]).toMatchObject({ errorRatePercent: 20, status: "DEGRADED" });
    expect(degraded.status).toBe("DEGRADED");

    const tooFew = summarizeWebhooks([row("PIXEL", "ERROR", WEBHOOK_MIN_SAMPLE - 1)]);
    expect(tooFew.providers[0]?.errorRatePercent).toBe(100);
    expect(tooFew.providers[0]?.status).toBe("HEALTHY");
  });

  it("isole un fournisseur dégradé sans masquer l'autre, et trie par code", () => {
    const health = summarizeWebhooks([
      row("PIXEL", "ERROR", 5),
      row("PIXEL", "PROCESSED", 5),
      row("PAYSTACK", "PROCESSED", 50),
    ]);
    expect(health.providers.map((provider) => [provider.providerCode, provider.status])).toEqual([
      ["PAYSTACK", "HEALTHY"],
      ["PIXEL", "DEGRADED"],
    ]);
    expect(health).toMatchObject({ total: 60, failed: 5, status: "DEGRADED" });
  });
});

describe("summarizeStorage", () => {
  const tenant = (name: string, bytes: number, assets = 1) => ({ tenantId: name, tenantName: name, bytes, assets });

  it("additionne et classe les entreprises, en ne gardant que les plus consommatrices", () => {
    const storage = summarizeStorage([
      tenant("A", 100, 2),
      tenant("B", 900, 3),
      tenant("C", 500),
      tenant("D", 50),
      tenant("E", 10),
      tenant("F", 1),
    ]);
    expect(storage).toMatchObject({ totalBytes: 1561, assetsCount: 9, tenantsCount: 6 });
    expect(storage.topTenants.map((entry) => entry.tenantName)).toEqual(["B", "C", "A", "D", "E"]);
  });

  it("est vide sans fichier", () => {
    expect(summarizeStorage([])).toEqual({ totalBytes: 0, assetsCount: 0, tenantsCount: 0, topTenants: [] });
  });
});

describe("overallStatus", () => {
  it("retient le plus grave des composants", () => {
    expect(overallStatus(["HEALTHY", "DEGRADED", "HEALTHY"])).toBe("DEGRADED");
    expect(overallStatus(["HEALTHY", "DOWN", "DEGRADED"])).toBe("DOWN");
  });

  it("ne dégrade pas l'état global faute de données", () => {
    expect(overallStatus(["HEALTHY", "NO_DATA"])).toBe("HEALTHY");
    expect(overallStatus(["NO_DATA"])).toBe("HEALTHY");
  });
});
