import { describe, expect, it } from "vitest";

import { formatAmount, formatDate, formatDateTime, formatNumber } from "./format";

describe("format (admin)", () => {
  it("formate les nombres en français (séparateur de milliers)", () => {
    expect(formatNumber(1234567).replace(/\s/g, " ")).toBe("1 234 567");
    expect(formatAmount(10000, "XOF").replace(/\s/g, " ")).toBe("10 000 XOF");
  });

  it("renvoie un tiret pour une date absente", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });

  it("formate une date ISO", () => {
    expect(formatDate("2026-03-05T12:00:00Z")).toMatch(/2026/);
    expect(formatDateTime("2026-03-05T12:00:00Z")).toMatch(/2026/);
  });
});
