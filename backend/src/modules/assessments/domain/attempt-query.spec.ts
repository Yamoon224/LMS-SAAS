import { attemptDurationSeconds, buildAttemptsCsv, csvCell, filterAttempts, paginate } from "./attempt-query";
import type { AttemptListRow } from "./attempt-query";

const d = (iso: string) => new Date(iso);
const rows: AttemptListRow[] = [
  { id: "1", enrollmentId: "e1", learnerName: "Aïcha Koné", email: "aicha@ex.com", status: "PASSED", scorePercent: 90, startedAt: d("2026-11-01T10:00:00Z"), submittedAt: d("2026-11-01T10:30:00Z") },
  { id: "2", enrollmentId: "e2", learnerName: "Paul", email: "paul@ex.com", status: "FAILED", scorePercent: 30, startedAt: d("2026-11-05T10:00:00Z"), submittedAt: d("2026-11-05T10:10:00Z") },
  { id: "3", enrollmentId: "e2", learnerName: "Paul", email: "paul@ex.com", status: "IN_PROGRESS", scorePercent: null, startedAt: d("2026-11-10T10:00:00Z"), submittedAt: null },
];

describe("filterAttempts", () => {
  it("filters by learner ignoring case and accents", () => {
    expect(filterAttempts(rows, { learner: "AICHA" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterAttempts(rows, { learner: "kone" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterAttempts(rows, { learner: "ex.com" })).toHaveLength(3);
  });

  it("filters by status and date range (inclusive)", () => {
    expect(filterAttempts(rows, { status: "FAILED" }).map((r) => r.id)).toEqual(["2"]);
    expect(
      filterAttempts(rows, { from: d("2026-11-05T10:00:00Z"), to: d("2026-11-10T10:00:00Z") }).map((r) => r.id),
    ).toEqual(["2", "3"]);
  });

  it("combines filters", () => {
    expect(filterAttempts(rows, { learner: "paul", status: "IN_PROGRESS" }).map((r) => r.id)).toEqual(["3"]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, i) => i);

  it("returns the requested page and the total", () => {
    const page = paginate(items, 3, 20);
    expect(page.items).toEqual([40, 41, 42, 43, 44]);
    expect(page.total).toBe(45);
  });

  it("bounds page and size", () => {
    expect(paginate(items, 0, 1000)).toMatchObject({ page: 1, pageSize: 100 });
    expect(paginate(items, 1, 0).pageSize).toBe(1);
    expect(paginate(items, 99, 20).items).toEqual([]);
  });
});

describe("CSV export", () => {
  it("quotes separators, quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });

  it("neutralises spreadsheet formulas but keeps numbers", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-5)).toBe("-5");
  });

  it("builds a BOM + CRLF document with duration", () => {
    const csv = buildAttemptsCsv(rows);
    expect(csv.startsWith("﻿Apprenant,")).toBe(true);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain("Réussie,90,2026-11-01T10:00:00.000Z,2026-11-01T10:30:00.000Z,1800");
    expect(lines[3]).toContain("En cours,,2026-11-10T10:00:00.000Z,,");
  });

  it("computes durations", () => {
    expect(attemptDurationSeconds(d("2026-11-01T10:00:00Z"), null)).toBeNull();
    expect(attemptDurationSeconds(d("2026-11-01T10:00:00Z"), d("2026-11-01T10:01:30Z"))).toBe(90);
  });
});
