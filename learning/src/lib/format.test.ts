import { describe, expect, it } from "vitest";

import { dictionaries } from "./i18n/dictionaries";

import { formatDuration, formatPrice } from "./format";

const labels = dictionaries.fr.format;

describe("format (learning)", () => {
  it("affiche « gratuit » pour un prix nul", () => {
    expect(formatPrice(0, "XOF", "fr", labels)).toBe(labels.free);
  });

  it("formate un prix en XOF avec le libellé de la devise, sinon le code", () => {
    expect(formatPrice(25000, "XOF", "fr", labels).replace(/\s/g, " ")).toContain("25 000");
    expect(formatPrice(25000, "XOF", "fr", labels)).toContain(labels.currencyXof);
    expect(formatPrice(30, "EUR", "en", labels)).toBe("30 EUR");
  });

  it("formate les durées", () => {
    expect(formatDuration(null, labels)).toBeNull();
    expect(formatDuration(0, labels)).toBeNull();
    expect(formatDuration(45, labels)).toBe(`45 ${labels.minutesShort}`);
    expect(formatDuration(120, labels)).toBe(`2 ${labels.hoursShort}`);
    expect(formatDuration(125, labels)).toBe(`2 ${labels.hoursShort} 05`);
  });
});
