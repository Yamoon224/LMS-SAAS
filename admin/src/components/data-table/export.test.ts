import { describe, expect, it } from "vitest";

import {
  buildExportRows,
  buildFileName,
  buildPrintHtml,
  buildSearchText,
  compareValues,
  escapeCsvCell,
  matchesSearch,
  normalizeForSearch,
  sanitizeForCsv,
  toCsv,
} from "./export";
import type { DataTableColumn } from "./types";

interface Row {
  name: string;
  amount: number | null;
  createdAt: Date;
  active: boolean;
}

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Nom", cell: (r) => r.name, accessor: (r) => r.name },
  { id: "amount", header: "Montant", cell: (r) => `${r.amount} XOF`, accessor: (r) => r.amount, exportValue: (r) => r.amount },
  { id: "createdAt", header: "Créé le", cell: () => null, accessor: (r) => r.createdAt },
  { id: "active", header: "Actif", cell: () => null, accessor: (r) => r.active },
  { id: "badge", header: "Statut", cell: () => "x", exportValue: () => "Actif" },
];

describe("normalizeForSearch", () => {
  it("ignore casse et diacritiques", () => {
    expect(normalizeForSearch("  Éléphant  CÔTE   d'Ivoire ")).toBe("elephant cote d'ivoire");
  });
});

describe("sanitizeForCsv", () => {
  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"])("préfixe %j d'une apostrophe", (value) => {
    expect(sanitizeForCsv(value)).toBe(`'${value}`);
  });
  it("laisse le texte normal intact", () => {
    expect(sanitizeForCsv("Bonjour = monde")).toBe("Bonjour = monde");
  });
});

describe("escapeCsvCell", () => {
  it("met entre guillemets les séparateurs, guillemets et sauts de ligne", () => {
    expect(escapeCsvCell("a;b")).toBe('"a;b"');
    expect(escapeCsvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(escapeCsvCell("l1\nl2")).toBe('"l1\nl2"');
  });
  it("combine neutralisation de formule et guillemets", () => {
    expect(escapeCsvCell('=HYPERLINK("x";"y")')).toBe(`"'=HYPERLINK(""x"";""y"")"`);
  });
  it("n'altère pas les nombres négatifs typés et gère les vides", () => {
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(new Date(2026, 0, 5, 14, 30))).toBe("05/01/2026 14:30");
  });
});

describe("toCsv", () => {
  it("produit BOM, séparateur ; et CRLF", () => {
    const csv = toCsv(["Nom", "Montant"], [["Acme; Inc", 12], ["=1+1", null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿Nom;Montant\r\n"Acme; Inc";12\r\n\'=1+1;\r\n');
  });
});

describe("buildExportRows", () => {
  const rows: Row[] = [{ name: "Acme", amount: 1500, createdAt: new Date(2026, 1, 3), active: true }];
  it("utilise exportValue puis accessor, sans colonne d'actions", () => {
    const table = buildExportRows(rows, columns);
    expect(table.headers).toEqual(["Nom", "Montant", "Créé le", "Actif", "Statut"]);
    expect(table.rows[0]).toEqual(["Acme", 1500, rows[0]!.createdAt, "Oui", "Actif"]);
  });
  it("respecte les colonnes passées (visibles uniquement)", () => {
    const table = buildExportRows(rows, [columns[0]!]);
    expect(table.headers).toEqual(["Nom"]);
    expect(table.rows).toEqual([["Acme"]]);
  });
  it("replie sur le texte de cell quand il est primitif", () => {
    const table = buildExportRows(rows, [{ id: "n", header: "N", cell: (r: Row) => r.name }]);
    expect(table.rows[0]).toEqual(["Acme"]);
  });
});

describe("recherche", () => {
  const row: Row = { name: "Société Générale", amount: 10, createdAt: new Date(2026, 0, 1), active: false };
  const haystack = buildSearchText(row, columns);
  it("est ET multi-termes, insensible aux accents", () => {
    expect(matchesSearch(haystack, "societe generale")).toBe(true);
    expect(matchesSearch(haystack, "GENERALE soc")).toBe(true);
    expect(matchesSearch(haystack, "societe banque")).toBe(false);
  });
  it("n'indexe pas les colonnes sans accessor", () => {
    expect(matchesSearch(haystack, "actif")).toBe(false);
  });
});

describe("compareValues", () => {
  it("trie numériquement, dates par instant, nuls en dernier dans les deux sens", () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues("file2", "file10")).toBeLessThan(0);
    expect(compareValues(new Date(2020, 0, 1), new Date(2021, 0, 1))).toBeLessThan(0);
    expect(compareValues(null, 1, "asc")).toBeGreaterThan(0);
    expect(compareValues(null, 1, "desc")).toBeGreaterThan(0);
    expect(compareValues("é", "f")).toBeLessThan(0);
    expect(compareValues("b", "a", "desc")).toBeLessThan(0);
  });
});

describe("buildFileName / buildPrintHtml", () => {
  it("construit <titre>-AAAA-MM-JJ.ext", () => {
    expect(buildFileName("Entreprises à suivre", "csv", new Date(2026, 10, 3))).toBe("entreprises-a-suivre-2026-11-03.csv");
  });
  it("échappe le HTML et affiche titre, recherche et nombre de lignes", () => {
    const html = buildPrintHtml({
      title: "entreprises",
      generatedAt: new Date(2026, 10, 3, 9, 5),
      search: "<b>x</b>",
      table: { headers: ["Nom"], rows: [["<script>"], ["B"]] },
    });
    expect(html).toContain("<h1>Entreprises</h1>");
    expect(html).toContain("03/11/2026 à 09:05");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("2 lignes");
  });
});
