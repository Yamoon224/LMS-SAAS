import { describe, expect, it } from "vitest";

import { detectPreset, PERIOD_PRESETS, rangeForPreset, toDateInput } from "./analytics.schema";

describe("rangeForPreset", () => {
  const now = new Date(2026, 0, 15, 14, 30); // 15 janvier 2026, heure locale

  it("aujourd'hui : un seul jour", () => {
    expect(rangeForPreset("today", now)).toEqual({ from: "2026-01-15", to: "2026-01-15" });
  });

  it("« 7 jours » compte 7 jours calendaires, aujourd'hui compris", () => {
    expect(rangeForPreset("7d", now)).toEqual({ from: "2026-01-09", to: "2026-01-15" });
  });

  it("« 30 jours » et « 90 jours » traversent les mois et les années", () => {
    expect(rangeForPreset("30d", now)).toEqual({ from: "2025-12-17", to: "2026-01-15" });
    expect(rangeForPreset("90d", now)).toEqual({ from: "2025-10-18", to: "2026-01-15" });
  });

  it("ce mois-ci : du 1er à aujourd'hui", () => {
    expect(rangeForPreset("month", now)).toEqual({ from: "2026-01-01", to: "2026-01-15" });
  });

  it("mois dernier en janvier : tout décembre de l'année précédente", () => {
    expect(rangeForPreset("lastMonth", now)).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("mois dernier le 31 mars : février entier, même sans 31 février", () => {
    expect(rangeForPreset("lastMonth", new Date(2026, 2, 31))).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("cette année : du 1er janvier à aujourd'hui", () => {
    expect(rangeForPreset("year", now)).toEqual({ from: "2026-01-01", to: "2026-01-15" });
  });
});

describe("detectPreset", () => {
  const now = new Date(2026, 5, 20);

  it("reconnaît chaque raccourci à partir de ses propres dates", () => {
    for (const preset of PERIOD_PRESETS) {
      const range = rangeForPreset(preset, now);
      expect(detectPreset(range.from ?? "", range.to ?? "", now)).toBe(preset);
    }
  });

  it("retourne « custom » pour des dates qui ne correspondent à aucun raccourci", () => {
    expect(detectPreset("2026-03-03", "2026-03-09", now)).toBe("custom");
  });
});

describe("toDateInput", () => {
  it("formate un jour local sur 2 chiffres, sans décalage de fuseau", () => {
    expect(toDateInput(new Date(2026, 8, 5, 23, 59))).toBe("2026-09-05");
  });
});
