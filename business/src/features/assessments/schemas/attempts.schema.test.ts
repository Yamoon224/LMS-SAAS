import { describe, expect, it } from "vitest";

import { attemptFiltersToQuery, EMPTY_ATTEMPT_FILTERS, examAttemptSchema, formatDuration, formatScore } from "./attempts.schema";

describe("tentatives d'examen (ENT-37)", () => {
  it("analyse une ligne du backend et convertit les dates", () => {
    const row = examAttemptSchema.parse({
      id: "a1",
      enrollmentId: "e1",
      learnerName: "Aya Koné",
      email: "aya@exemple.com",
      status: "PASSED",
      scorePercent: 85,
      startedAt: "2026-11-01T10:00:00.000Z",
      submittedAt: "2026-11-01T10:30:00.000Z",
    });
    expect(row.startedAt).toBeInstanceOf(Date);
    expect(row.scorePercent).toBe(85);
  });

  it("accepte une tentative en cours sans note ni apprenant connu", () => {
    const row = examAttemptSchema.parse({
      id: "a2",
      enrollmentId: "e2",
      learnerName: null,
      email: null,
      status: "IN_PROGRESS",
      scorePercent: null,
      startedAt: "2026-11-01T10:00:00.000Z",
      submittedAt: null,
    });
    expect(formatScore(row.scorePercent)).toBe("—");
  });

  it("refuse un statut inconnu", () => {
    expect(
      examAttemptSchema.safeParse({ id: "a", enrollmentId: "e", status: "HACKED", startedAt: "2026-11-01T10:00:00Z" }).success,
    ).toBe(false);
  });

  it("formate la note", () => {
    expect(formatScore(0)).toBe("0 %");
    expect(formatScore(85)).toBe("85 %");
  });
});

describe("filtres et durée des tentatives (ENT-37)", () => {
  it("n'émet aucun paramètre pour des filtres vides", () => {
    expect(attemptFiltersToQuery(EMPTY_ATTEMPT_FILTERS)).toBe("");
  });

  it("encode apprenant, statut, période et pagination", () => {
    const query = attemptFiltersToQuery({ learner: " Aïcha ", status: "PASSED", from: "2026-11-01", to: "2026-11-30" }, 2, 20);
    const params = new URLSearchParams(query);
    expect(params.get("learner")).toBe("Aïcha");
    expect(params.get("status")).toBe("PASSED");
    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("20");
    expect(new Date(params.get("to") as string).getTime()).toBeGreaterThan(new Date(params.get("from") as string).getTime());
  });

  it("formate la durée", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(725)).toBe("12 min 05 s");
  });
});
