import type { NotificationsFacade } from "@modules/notifications/notifications.facade";

import type { PlatformHealthRepositoryPort } from "../domain/platform-health.repository.port";

import { GetPlatformHealthUseCase } from "./get-platform-health.use-case";

const NOW = new Date("2026-11-17T12:00:00Z");

function build(options: {
  queue?: () => Promise<{ waiting: number; active: number; delayed: number; failed: number; paused: number }>;
  webhooks?: { providerCode: string; outcome: "PROCESSED" | "ERROR"; count: number }[];
  storage?: { tenantId: string; tenantName: string; bytes: number; assets: number }[];
}) {
  const repository: jest.Mocked<PlatformHealthRepositoryPort> = {
    getWebhookCounts: jest.fn().mockResolvedValue(options.webhooks ?? []),
    getStorageByTenant: jest.fn().mockResolvedValue(options.storage ?? []),
  };
  const notifications = {
    getQueueStats:
      options.queue ?? jest.fn().mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0, paused: 0 }),
  } as unknown as NotificationsFacade;
  return { useCase: new GetPlatformHealthUseCase(repository, notifications), repository };
}

describe("GetPlatformHealthUseCase", () => {
  it("lit les webhooks des 24 dernières heures seulement", async () => {
    const { useCase, repository } = build({});
    await useCase.execute(NOW);
    expect(repository.getWebhookCounts).toHaveBeenCalledWith(new Date("2026-11-16T12:00:00Z"));
  });

  it("est globalement sain quand tout va bien, même sans aucun webhook reçu", async () => {
    const report = await build({}).useCase.execute(NOW);
    expect(report.overall).toBe("HEALTHY");
    expect(report.webhooks.status).toBe("NO_DATA");
    expect(report.queues[0]).toMatchObject({ name: "notifications", available: true, status: "HEALTHY" });
  });

  it("signale une file injoignable sans empêcher d'afficher webhooks et stockage", async () => {
    const { useCase } = build({
      queue: () => Promise.reject(new Error("ECONNREFUSED redis")),
      storage: [{ tenantId: "t1", tenantName: "Acme", bytes: 2048, assets: 2 }],
      webhooks: [{ providerCode: "PAYSTACK", outcome: "PROCESSED", count: 10 }],
    });
    const report = await useCase.execute(NOW);
    expect(report.queues[0]).toMatchObject({ available: false, counts: null, status: "DOWN" });
    expect(report.overall).toBe("DOWN");
    expect(report.storage.totalBytes).toBe(2048);
    expect(report.webhooks.total).toBe(10);
  });

  it("dégrade l'état global quand un fournisseur a trop d'erreurs", async () => {
    const report = await build({
      webhooks: [
        { providerCode: "PIXEL", outcome: "PROCESSED", count: 6 },
        { providerCode: "PIXEL", outcome: "ERROR", count: 4 },
      ],
    }).useCase.execute(NOW);
    expect(report.webhooks.status).toBe("DEGRADED");
    expect(report.overall).toBe("DEGRADED");
  });

  it("dégrade l'état global quand des tâches de la file ont échoué", async () => {
    const report = await build({
      queue: () => Promise.resolve({ waiting: 0, active: 0, delayed: 0, failed: 3, paused: 0 }),
    }).useCase.execute(NOW);
    expect(report.queues[0]?.status).toBe("DEGRADED");
    expect(report.overall).toBe("DEGRADED");
  });
});

describe("GetPlatformHealthUseCase - files partagées (BE-08)", () => {
  const counts = (over: Partial<{ waiting: number; active: number; delayed: number; failed: number; paused: number }> = {}) => ({
    waiting: 0,
    active: 0,
    delayed: 0,
    failed: 0,
    paused: 0,
    ...over,
  });

  function buildWithShared(getAllStats: () => Promise<{ name: string; counts: ReturnType<typeof counts> }[]>) {
    const repository = {
      getWebhookCounts: jest.fn().mockResolvedValue([]),
      getStorageByTenant: jest.fn().mockResolvedValue([]),
    } as unknown as PlatformHealthRepositoryPort;
    const notifications = { getQueueStats: jest.fn().mockResolvedValue(counts()) } as unknown as NotificationsFacade;
    return new GetPlatformHealthUseCase(repository, notifications, { getAllStats } as never);
  }

  it("ajoute chaque file partagée après « notifications » avec son propre statut", async () => {
    const report = await buildWithShared(async () => [
      { name: "pdf", counts: counts() },
      { name: "reminders", counts: counts({ failed: 2 }) },
    ]).execute(NOW);
    expect(report.queues.map((q) => [q.name, q.status])).toEqual([
      ["notifications", "HEALTHY"],
      ["pdf", "HEALTHY"],
      ["reminders", "DEGRADED"],
    ]);
    expect(report.overall).toBe("DEGRADED");
  });

  it("ignore les files partagées illisibles sans dégrader le rapport", async () => {
    const report = await buildWithShared(() => Promise.reject(new Error("redis down"))).execute(NOW);
    expect(report.queues).toHaveLength(1);
    expect(report.queues[0]?.name).toBe("notifications");
    expect(report.overall).toBe("HEALTHY");
  });
});
