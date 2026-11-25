import { describe, expect, it } from "vitest";

import { formatAmount, formatDate, formatDateTime } from "./format";

describe("format (business)", () => {
  it("formate un montant avec séparateur de milliers et devise", () => {
    expect(formatAmount(1500000).replace(/\s/g, " ")).toBe("1 500 000 XOF");
    expect(formatAmount(250, "EUR")).toBe("250 EUR");
    expect(formatAmount(0)).toBe("0 XOF");
  });

  it("renvoie un tiret pour une date absente", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });

  it("formate une date valide en français", () => {
    expect(formatDate(new Date(2026, 2, 5))).toBe("05/03/2026");
    expect(formatDateTime(new Date(2026, 2, 5, 14, 30))).toMatch(/05\/03\/2026.*14:30/);
  });
});
