import { computeProgressPercent, upcomingSessionsSorted } from "./learner-dashboard";

describe("computeProgressPercent", () => {
  it("calcule un pourcentage entier", () => {
    expect(computeProgressPercent(1, 3)).toBe(33);
    expect(computeProgressPercent(2, 3)).toBe(67);
    expect(computeProgressPercent(4, 4)).toBe(100);
  });

  it("retourne 0 sans leçon ou avec des valeurs aberrantes, et borne à 100", () => {
    expect(computeProgressPercent(0, 0)).toBe(0);
    expect(computeProgressPercent(5, 0)).toBe(0);
    expect(computeProgressPercent(-3, 10)).toBe(0);
    expect(computeProgressPercent(12, 10)).toBe(100);
    expect(computeProgressPercent(1, Number.NaN)).toBe(0);
  });
});

describe("upcomingSessionsSorted", () => {
  const at = (iso: string) => ({ startAt: new Date(iso) });

  it("trie par début et limite le nombre", () => {
    const result = upcomingSessionsSorted([at("2026-12-03T10:00:00Z"), at("2026-12-01T10:00:00Z"), at("2026-12-02T10:00:00Z")], 2);
    expect(result.map((s) => s.startAt.toISOString())).toEqual(["2026-12-01T10:00:00.000Z", "2026-12-02T10:00:00.000Z"]);
  });

  it("ne modifie pas l'entrée et gère une limite nulle", () => {
    const input = [at("2026-12-03T10:00:00Z"), at("2026-12-01T10:00:00Z")];
    upcomingSessionsSorted(input, 5);
    expect(input[0]?.startAt.toISOString()).toBe("2026-12-03T10:00:00.000Z");
    expect(upcomingSessionsSorted(input, 0)).toEqual([]);
  });
});
