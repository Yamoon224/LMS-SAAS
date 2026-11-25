import { buildQuotaUsage } from "./tenant-overview";
import type { TenantUsageCounts } from "./tenant-overview";

const usage: TenantUsageCounts = {
  courses: 8,
  publishedCourses: 5,
  activeLearners: 120,
  totalLearners: 300,
  managers: 2,
  storageBytes: 1.5 * 1024 * 1024 * 1024,
  liveSessionsThisMonth: 0,
  creditsBalance: 0,
  lastActivityAt: null,
};

describe("buildQuotaUsage", () => {
  it("calcule le pourcentage d'usage par quota et convertit le stockage en Go", () => {
    const result = buildQuotaUsage({ maxCourses: 10, maxActiveLearners: 100, storageGb: 3 }, usage);
    expect(result.find((row) => row.key === "maxCourses")).toMatchObject({ limit: 10, used: 8, percent: 80 });
    expect(result.find((row) => row.key === "maxActiveLearners")).toMatchObject({ limit: 100, used: 120, percent: 120 });
    expect(result.find((row) => row.key === "storageGb")).toMatchObject({ limit: 3, used: 1.5, percent: 50, unit: "Go" });
  });

  it("traite un quota absent ou non numérique comme illimité", () => {
    const result = buildQuotaUsage({ maxManagers: null, liveSessionsPerMonth: "beaucoup" }, usage);
    expect(result.find((row) => row.key === "maxManagers")).toMatchObject({ limit: null, percent: null, used: 2 });
    expect(result.find((row) => row.key === "liveSessionsPerMonth")?.limit).toBeNull();
  });

  it("un quota à 0 est saturé dès qu'il y a de l'usage, à 0 % sinon", () => {
    const result = buildQuotaUsage({ maxCourses: 0, liveSessionsPerMonth: 0 }, usage);
    expect(result.find((row) => row.key === "maxCourses")?.percent).toBe(100);
    expect(result.find((row) => row.key === "liveSessionsPerMonth")?.percent).toBe(0);
  });

  it("sans plan (quotas null), renvoie les cinq quotas sans limite", () => {
    const result = buildQuotaUsage(null, usage);
    expect(result).toHaveLength(5);
    expect(result.every((row) => row.limit === null && row.percent === null)).toBe(true);
  });
});
