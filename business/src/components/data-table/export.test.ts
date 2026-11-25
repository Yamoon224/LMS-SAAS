import { describe, expect, it } from "vitest";

import {
  buildExportRows,
  buildPrintHtml,
  escapeCsvCell,
  exportFileName,
  filterRows,
  normalizeForSearch,
  sanitizeForCsv,
  sortRows,
  toCsv,
} from "./export";
import type { DataTableColumn } from "./types";

interface Row {
  id: string;
  name: string;
  price: number | null;
  date: Date | null;
}

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Nom", cell: (r) => r.name, accessor: (r) => r.name },
  { id: "price", header: "Prix", cell: (r) => String(r.price), accessor: (r) => r.price },
  { id: "date", header: "Date", cell: (r) => String(r.date), accessor: (r) => r.date },
  { id: "x", header: "Sans accessor", cell: () => null },
];

const rows: Row[] = [
  { id: "1", name: "Été à Paris", price: 10, date: new Date(2025, 0, 5) },
  { id: "2", name: "formation 2", price: 9, date: null },
  { id: "3", name: "Formation 10", price: null, date: new Date(2024, 5, 1) },
  { id: "4", name: "Zèbre", price: 100, date: new Date(2026, 2, 3, 14, 30) },
];

describe("normalizeForSearch", () => {
  it("retire accents et casse", () => {
    expect(normalizeForSearch("  Été À PARIS ")).toBe("ete a paris");
  });
});

describe("sanitizeForCsv / escapeCsvCell", () => {
  it("préfixe les débuts dangereux", () => {
    for (const bad of ["=1+1", "+33", "-2", "@SUM(A1)", "\tx", "\rx"]) {
      expect(sanitizeForCsv(bad)).toBe(`'${bad}`);
    }
    expect(sanitizeForCsv("normal")).toBe("normal");
  });
  it("cite et double les guillemets", () => {
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
    expect(escapeCsvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(escapeCsvCell("l1\nl2")).toBe('"l1\nl2"');
  });
  it("laisse les nombres négatifs intacts et utilise la virgule décimale", () => {
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell(12.5)).toBe("12,5");
  });
  it("gère null, booléens et dates", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(true)).toBe("Oui");
    expect(escapeCsvCell(new Date(2025, 0, 5))).toBe("05/01/2025");
  });
  it("protège puis cite une cellule dangereuse contenant un séparateur", () => {
    expect(escapeCsvCell("=A1;B1")).toBe(`"'=A1;B1"`);
  });
});

describe("toCsv", () => {
  it("BOM, séparateur ; et CRLF", () => {
    const csv = toCsv({ headers: ["A", "B"], rows: [["x", 1], ["=y", null]] });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿A;B\r\nx;1\r\n'=y;\r\n");
  });
});

describe("filterRows", () => {
  it("multi-termes ET, insensible aux accents", () => {
    expect(filterRows(rows, columns, "ete paris").map((r) => r.id)).toEqual(["1"]);
    expect(filterRows(rows, columns, "formation 10").map((r) => r.id)).toEqual(["3"]);
    expect(filterRows(rows, columns, "formation zèbre")).toEqual([]);
  });
  it("requête vide = tout", () => {
    expect(filterRows(rows, columns, "  ")).toHaveLength(4);
  });
  it("ignore les colonnes sans accessor", () => {
    expect(filterRows(rows, columns, "null")).toEqual([]);
  });
});

describe("sortRows", () => {
  it("tri numérique et valeurs nulles en dernier (asc et desc)", () => {
    const asc = sortRows(rows, columns, { columnId: "price", direction: "asc" }).map((r) => r.id);
    expect(asc).toEqual(["2", "1", "4", "3"]);
    const desc = sortRows(rows, columns, { columnId: "price", direction: "desc" }).map((r) => r.id);
    expect(desc).toEqual(["4", "1", "2", "3"]);
  });
  it("tri naturel des textes (numeric) et par date", () => {
    expect(sortRows(rows, columns, { columnId: "name", direction: "asc" }).map((r) => r.name)).toEqual([
      "Été à Paris",
      "formation 2",
      "Formation 10",
      "Zèbre",
    ]);
    expect(sortRows(rows, columns, { columnId: "date", direction: "asc" }).map((r) => r.id)).toEqual([
      "3",
      "1",
      "4",
      "2",
    ]);
  });
  it("ne mute pas l'entrée", () => {
    const copy = [...rows];
    sortRows(rows, columns, { columnId: "name", direction: "desc" });
    expect(rows).toEqual(copy);
  });
});

describe("buildExportRows", () => {
  it("utilise exportValue en priorité et null pour undefined", () => {
    const cols: DataTableColumn<Row>[] = [
      { id: "name", header: "Nom", cell: (r) => r.name, accessor: (r) => r.name },
      { id: "price", header: "Prix", cell: () => null, accessor: (r) => r.price, exportValue: (r) => `${r.price} €` },
      { id: "u", header: "U", cell: () => null, accessor: () => undefined },
    ];
    const table = buildExportRows(rows.slice(0, 1), cols);
    expect(table.headers).toEqual(["Nom", "Prix", "U"]);
    expect(table.rows).toEqual([["Été à Paris", "10 €", null]]);
  });
  it("repli sur cell primitif sinon null", () => {
    const table = buildExportRows(rows.slice(0, 1), [columns[3]!, { id: "c", header: "C", cell: () => "txt" }]);
    expect(table.rows).toEqual([[null, "txt"]]);
  });
});

describe("exportFileName / print", () => {
  it("slug + date locale", () => {
    expect(exportFileName("Formations Été", "csv", new Date(2026, 10, 9))).toBe("formations-ete-2026-11-09.csv");
    expect(exportFileName(undefined, "xlsx", new Date(2026, 0, 2))).toBe("export-2026-01-02.xlsx");
  });
  it("échappe le HTML de la vue d'impression", () => {
    const html = buildPrintHtml(
      { headers: ["<b>"], rows: [["<script>alert(1)</script>"]] },
      { title: "T", search: "a&b", generatedAt: new Date(2026, 0, 2, 3, 4) },
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a&amp;b");
    expect(html).toContain("1 ligne");
  });
});
