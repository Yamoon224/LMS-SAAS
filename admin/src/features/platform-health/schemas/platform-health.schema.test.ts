import { describe, expect, it } from "vitest";

import { formatBytes, platformHealthSchema } from "./platform-health.schema";

describe("formatBytes", () => {
  it("affiche des octets bruts sous 1 Ko", () => {
    expect(formatBytes(0)).toBe("0 o");
    expect(formatBytes(512)).toBe("512 o");
  });

  it("convertit en base 1024 avec une décimale", () => {
    expect(formatBytes(1024)).toBe("1 Ko");
    expect(formatBytes(1536)).toBe("1,5 Ko");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 Mo");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3 Go");
  });

  it("ne dépasse pas la plus grande unité et tolère une valeur négative", () => {
    // Le séparateur de milliers français est une espace fine insécable : on normalise avant de comparer.
    expect(formatBytes(2 * 1024 ** 5).replace(/\s/g, " ")).toBe("2 048 To");
    expect(formatBytes(-5)).toBe("0 o");
  });
});

describe("platformHealthSchema", () => {
  const valid = {
    generatedAt: "2026-11-17T12:00:00.000Z",
    overall: "DEGRADED",
    queues: [{ name: "notifications", available: false, counts: null, status: "DOWN" }],
    webhooks: { windowHours: 24, total: 0, failed: 0, errorRatePercent: 0, status: "NO_DATA", providers: [] },
    storage: { totalBytes: 0, assetsCount: 0, tenantsCount: 0, topTenants: [] },
  };

  it("accepte une file injoignable (compteurs absents)", () => {
    expect(platformHealthSchema.parse(valid).queues[0]?.counts).toBeNull();
  });

  it("refuse un statut inconnu", () => {
    expect(() => platformHealthSchema.parse({ ...valid, overall: "OK" })).toThrow();
  });
});
