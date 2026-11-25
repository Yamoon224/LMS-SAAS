import type { ColumnValue, DataTableColumn, ExportCell, SortDirection } from "./types";

/** Plafond de lignes exportées en mode serveur. */
export const EXPORT_ROW_LIMIT = 5000;

const CSV_SEPARATOR = ";";
const CSV_BOM = "﻿";

/** Minuscules, sans accents (NFD), espaces normalisés : base de la recherche insensible à la casse et aux diacritiques. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Protection contre l'injection de formules : préfixe d'une apostrophe les textes débutant par = + - @ tab ou CR. */
export function sanitizeForCsv(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Échappe une cellule CSV : neutralise les formules (textes uniquement), puis met entre guillemets si nécessaire. */
export function escapeCsvCell(value: ExportCell | boolean | undefined, separator = CSV_SEPARATOR): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? sanitizeForCsv(value) : formatExportCell(value);
  return text.includes(separator) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV UTF-8 avec BOM, séparateur « ; » (Excel français), fins de ligne CRLF. */
export function toCsv(headers: string[], rows: ExportCell[][]): string {
  const lines = [headers, ...rows].map((line) => line.map((cell) => escapeCsvCell(cell)).join(CSV_SEPARATOR));
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

const pad = (value: number) => String(value).padStart(2, "0");

/** JJ/MM/AAAA, ou JJ/MM/AAAA HH:MM si l'heure n'est pas minuit. */
export function formatExportDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return hasTime ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

export function formatExportCell(value: ExportCell | boolean | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatExportDate(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

/** AAAA-MM-JJ (date locale). */
export function isoDay(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `<titre>-AAAA-MM-JJ.<ext>`, titre réduit à un slug ASCII. */
export function buildFileName(title: string | undefined, extension: string, date: Date = new Date()): string {
  const slug = normalizeForSearch(title ?? "export")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "export"}-${isoDay(date)}.${extension}`;
}

/** Valeur brute d'une colonne : accessor, sinon texte de `cell` si primitive. */
export function getColumnValue<T>(column: DataTableColumn<T>, row: T): ColumnValue {
  if (column.accessor) return column.accessor(row);
  const rendered = column.cell(row);
  return typeof rendered === "string" || typeof rendered === "number" ? rendered : undefined;
}

export function isSortable<T>(column: DataTableColumn<T>): boolean {
  return column.sortable ?? column.accessor !== undefined;
}

export function isSearchable<T>(column: DataTableColumn<T>): boolean {
  return column.searchable ?? column.accessor !== undefined;
}

function valueToText(value: ColumnValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : `${formatExportDate(value)} ${value.toISOString()}`;
  if (typeof value === "boolean") return value ? "oui" : "non";
  return String(value);
}

/** Texte normalisé indexé pour la recherche d'une ligne (colonnes `searchable`, y compris masquées). */
export function buildSearchText<T>(row: T, columns: DataTableColumn<T>[]): string {
  return normalizeForSearch(
    columns
      .filter(isSearchable)
      .map((column) => valueToText(getColumnValue(column, row)))
      .join(" "),
  );
}

/** Tous les termes (séparés par des espaces) doivent être présents (ET). */
export function matchesSearch(haystack: string, query: string): boolean {
  const terms = normalizeForSearch(query).split(" ").filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

function isNil(value: ColumnValue): value is null | undefined {
  return value === null || value === undefined || (typeof value === "number" && Number.isNaN(value));
}

/** Comparateur de tri : nombres numériquement, dates par instant, textes localisés ; valeurs vides toujours en dernier. */
export function compareValues(a: ColumnValue, b: ColumnValue, direction: SortDirection = "asc"): number {
  const aNil = isNil(a);
  const bNil = isNil(b);
  if (aNil || bNil) return aNil && bNil ? 0 : aNil ? 1 : -1;
  const sign = direction === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * sign;
  if (a instanceof Date && b instanceof Date) return (a.getTime() - b.getTime()) * sign;
  if (typeof a === "boolean" && typeof b === "boolean") return (Number(a) - Number(b)) * sign;
  return collator.compare(valueToText(a), valueToText(b)) * sign;
}

export interface ExportTable {
  headers: string[];
  rows: ExportCell[][];
}

/** Lignes d'export pour les colonnes données (déjà filtrées sur les colonnes visibles, sans colonne d'actions). */
export function buildExportRows<T>(rows: T[], columns: DataTableColumn<T>[]): ExportTable {
  return {
    headers: columns.map((column) => column.header),
    rows: rows.map((row) =>
      columns.map((column): ExportCell => {
        if (column.exportValue) return column.exportValue(row);
        const value = getColumnValue(column, row);
        if (value === null || value === undefined) return null;
        if (typeof value === "boolean") return value ? "Oui" : "Non";
        return value;
      }),
    ),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface PrintDocumentOptions {
  title: string;
  generatedAt: Date;
  search?: string;
  table: ExportTable;
  /** Phrase ajoutée quand l'export est plafonné. */
  capNotice?: string;
}

/** Document HTML autonome d'impression (A4 paysage) : aucune feuille de style de l'application n'est touchée. */
export function buildPrintHtml({ title, generatedAt, search, table, capNotice }: PrintDocumentOptions): string {
  const heading = title.charAt(0).toUpperCase() + title.slice(1);
  const generated = `${pad(generatedAt.getDate())}/${pad(generatedAt.getMonth() + 1)}/${generatedAt.getFullYear()} à ${pad(generatedAt.getHours())}:${pad(generatedAt.getMinutes())}`;
  const count = table.rows.length;
  const countLabel = `${count} ${count > 1 ? "lignes" : "ligne"}`;
  const rowsHtml = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(formatExportCell(cell))}</td>`).join("")}</tr>`)
    .join("");
  const searchHtml = search ? ` · Recherche : « ${escapeHtml(search)} »` : "";
  const capHtml = capNotice ? ` · ${escapeHtml(capNotice)}` : "";
  const headHtml = table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(buildFileName(title, "pdf").replace(/\.pdf$/, ""))}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
h1 { font-size: 18px; margin: 0 0 4px; }
.meta { color: #475569; margin: 0 0 12px; line-height: 1.5; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #f1f5f9; font-weight: 600; }
tr { break-inside: avoid; }
.foot { margin-top: 10px; color: #475569; }
</style></head><body>
<h1>${escapeHtml(heading)}</h1>
<p class="meta">Généré le ${escapeHtml(generated)}${searchHtml}<br>${countLabel}${capHtml}</p>
<table><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
<p class="foot">${countLabel} au total</p>
</body></html>`;
}
