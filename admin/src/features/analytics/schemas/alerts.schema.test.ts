import { describe, expect, it } from "vitest";

import { adminAlertsSchema, countBySeverity, safeAlertHref } from "./alerts.schema";
import type { AdminAlert } from "./alerts.schema";

const alert = (severity: AdminAlert["severity"], count = 1): AdminAlert => ({
  type: "FAILED_PAYMENTS",
  severity,
  title: "Titre",
  detail: "Détail",
  count,
  href: "/transactions",
});

describe("adminAlertsSchema", () => {
  it("accepte la réponse de GET /admin/alerts et convertit la date", () => {
    const parsed = adminAlertsSchema.parse({
      generatedAt: "2026-11-19T10:00:00.000Z",
      criticalCount: 1,
      alerts: [alert("CRITICAL")],
    });
    expect(parsed.generatedAt).toBeInstanceOf(Date);
    expect(parsed.alerts).toHaveLength(1);
  });

  it("rejette une sévérité inconnue", () => {
    expect(() =>
      adminAlertsSchema.parse({
        generatedAt: new Date(),
        criticalCount: 0,
        alerts: [{ ...alert("INFO"), severity: "FATAL" }],
      }),
    ).toThrow();
  });
});

describe("countBySeverity", () => {
  it("compte les alertes par sévérité, zéro par défaut", () => {
    expect(countBySeverity([alert("CRITICAL"), alert("INFO"), alert("INFO")])).toEqual({ CRITICAL: 1, WARNING: 0, INFO: 2 });
    expect(countBySeverity([])).toEqual({ CRITICAL: 0, WARNING: 0, INFO: 0 });
  });
});

describe("safeAlertHref", () => {
  it("conserve les chemins internes", () => {
    expect(safeAlertHref("/wallets")).toBe("/wallets");
  });

  it("neutralise les liens externes ou relatifs au protocole", () => {
    expect(safeAlertHref("https://evil.example")).toBe("/");
    expect(safeAlertHref("//evil.example")).toBe("/");
    expect(safeAlertHref("javascript:alert(1)")).toBe("/");
  });
});
