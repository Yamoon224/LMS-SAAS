import { describe, expect, it } from "vitest";

import { balancedRows, cardSpans } from "./card-grid";

describe("balancedRows", () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [3, [3]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 3]],
    [7, [3, 2, 2]],
    [11, [3, 3, 3, 2]],
  ])("répartit %i cartes en %j", (count, expected) => {
    expect(balancedRows(count)).toEqual(expected);
  });

  it("ne laisse jamais de trou : la somme des emprises de chaque ligne vaut 6 colonnes", () => {
    for (let count = 1; count <= 14; count++) {
      for (const size of balancedRows(count)) expect([1, 2, 3]).toContain(size);
      expect(balancedRows(count).reduce((a, b) => a + b, 0)).toBe(count);
    }
  });
});

describe("cardSpans", () => {
  it("étire chaque carte selon la taille de sa ligne", () => {
    expect(cardSpans(5).map((span) => span.split(" ")[0])).toEqual([
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-2",
      "lg:col-span-3",
      "lg:col-span-3 sm:col-span-2".split(" ")[0],
    ]);
  });

  it("fait occuper toute la ligne à la dernière carte seule en 2 colonnes", () => {
    expect(cardSpans(5)[4]).toContain("sm:col-span-2");
    expect(cardSpans(6)[5]).not.toContain("sm:col-span-2");
  });
});
