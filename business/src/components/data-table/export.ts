import type { CellPrimitive, DataTableColumn, ExportCell, ExportTable, SortState } from "./types";

/* ------------------------------------------------------------------ */
/* Recherche                                                           */
/* ------------------------------------------------------------------ */

/** Minuscule + suppression des diacritiques (NFD) pour une recherche tolérante. */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Valeur d'une colonne : `accessor`, sinon version primitive de `cell`, sinon null. */
export function getColumnValue<T>(column: DataTableColumn<T>, row: T): CellPrimitive {
  if (column.accessor) return column.accessor(row);
  const rendered = column.cell(row);
  if (typeof rendered === "string" || typeof rendered === "number" || typeof rendered === "boolean") {
    return rendered;
  }
  return null;
}

export function isSearchable<T>(column: DataTableColumn<T>): boolean {
  return column.searchable ?? Boolean(column.accessor);
}

export function isSortable<T>(column: DataTableColumn<T>): boolean {
  return column.sortable ?? Boolean(column.accessor);
}

export function valueToText(value: CellPrimitive): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : formatDateFr(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

/** Recherche multi-termes (ET) sur les colonnes recherchables. */
export function filterRows<T>(rows: T[], columns: DataTableColumn<T>[], query: string): T[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;
  const searchable = columns.filter(isSearchable);
  if (searchable.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = normalizeForSearch(
      searchable.map((column) => valueToText(getColumnValue(column, row))).join(" \u0001 "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

/* ------------------------------------------------------------------ */
/* Tri                                                                 */
/* ------------------------------------------------------------------ */

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

function isNil(value: CellPrimitive): value is null | undefined {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (value instanceof Date && Number.isNaN(value.getTime()))
  );
}

/** Comparateur « croissant » de deux valeurs non nulles. */
export function compareValues(a: CellPrimitive, b: CellPrimitive): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return collator.compare(valueToText(a), valueToText(b));
}

/** Tri stable ; les valeurs vides sont toujours en dernier, quelle que soit la direction. */
export function sortRows<T>(rows: T[], columns: DataTableColumn<T>[], sort: SortState | null): T[] {
  if (!sort) return rows;
  const column = columns.find((c) => c.id === sort.columnId);
  if (!column) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: getColumnValue(column, row) }))
    .sort((x, y) => {
      const xNil = isNil(x.value);
      const yNil = isNil(y.value);
      if (xNil && yNil) return x.index - y.index;
      if (xNil) return 1;
      if (yNil) return -1;
      const result = compareValues(x.value, y.value) * factor;
      return result !== 0 ? result : x.index - y.index;
    })
    .map((entry) => entry.row);
}

/* ------------------------------------------------------------------ */
/* Dates / noms de fichiers                                            */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

/** JJ/MM/AAAA, avec HH:MM si l'heure n'est pas minuit (heure locale). */
export function formatDateFr(date: Date): string {
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) return day;
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function slugify(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "export";
}

/** `<titre>-AAAA-MM-JJ.<ext>` */
export function exportFileName(title: string | undefined, ext: string, now: Date = new Date()): string {
  return `${slugify(title ?? "export")}-${isoDay(now)}.${ext}`;
}

/* ------------------------------------------------------------------ */
/* Lignes d'export                                                     */
/* ------------------------------------------------------------------ */

/** Construit en-têtes + lignes typées pour les colonnes données (déjà restreintes aux colonnes visibles). */
export function buildExportRows<T>(rows: T[], columns: DataTableColumn<T>[]): ExportTable {
  return {
    headers: columns.map((c) => c.header),
    rows: rows.map((row) =>
      columns.map((column): ExportCell => {
        const value = column.exportValue ? column.exportValue(row) : getColumnValue(column, row);
        return value === undefined ? null : value;
      }),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/** Protection contre l'injection de formules : préfixe d'une apostrophe les cellules dangereuses. */
export function sanitizeForCsv(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Échappe une cellule CSV (séparateur `;`). Les nombres gardent la virgule décimale française. */
export function escapeCsvCell(value: ExportCell | undefined): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (typeof value === "number") {
    text = Number.isFinite(value) ? String(value).replace(".", ",") : "";
  } else {
    text = sanitizeForCsv(valueToText(value));
  }
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const BOM = String.fromCharCode(0xfeff);

/** CSV UTF-8 avec BOM, séparateur `;`, fins de ligne CRLF (Excel français). */
export function toCsv(table: ExportTable): string {
  const lines = [table.headers, ...table.rows].map((line) => line.map((cell) => escapeCsvCell(cell)).join(";"));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

/* ------------------------------------------------------------------ */
/* Impression / PDF                                                    */
/* ------------------------------------------------------------------ */

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface PrintOptions {
  title: string;
  search?: string;
  generatedAt?: Date;
  note?: string;
}

/** Document HTML autonome (styles isolés dans l'iframe), paysage. */
export function buildPrintHtml(table: ExportTable, options: PrintOptions): string {
  const generatedAt = options.generatedAt ?? new Date();
  const when = `${generatedAt.toLocaleDateString("fr-FR")} à ${generatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(valueToText(cell))}</td>`).join("")}</tr>`)
    .join("");
  const search = options.search?.trim();
  const count = `${table.rows.length} ligne${table.rows.length > 1 ? "s" : ""}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(options.title)}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; font-size: 11px; margin: 0; padding: 12px; }
h1 { font-size: 18px; margin: 0 0 4px; }
.meta { color: #555; margin: 0 0 12px; display: flex; flex-wrap: wrap; gap: 4px 16px; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #eee; font-weight: 600; }
tr { page-break-inside: avoid; }
tbody tr:nth-child(even) td { background: #f8f8f8; }
@media print { body { padding: 0; } }
</style></head><body>
<h1>${escapeHtml(options.title)}</h1>
<p class="meta"><span>Généré le ${escapeHtml(when)}</span>${search ? `<span>Recherche : « ${escapeHtml(search)} »</span>` : ""}<span>${count}</span>${options.note ? `<span>${escapeHtml(options.note)}</span>` : ""}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Effets navigateur (non couverts par les tests unitaires)            */
/* ------------------------------------------------------------------ */

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadCsv(table: ExportTable, fileName: string): void {
  downloadBlob(new Blob([toCsv(table)], { type: "text/csv;charset=utf-8" }), fileName);
}

/** Bibliothèque chargée à la demande (import dynamique) : write-excel-file (dépend uniquement de fflate). */
export async function downloadXlsx(table: ExportTable, fileName: string, sheetName: string): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const widths = table.headers.map((header, index) => {
    let max = header.length;
    for (const row of table.rows.slice(0, 500)) {
      const length = valueToText(row[index]).length;
      if (length > max) max = length;
    }
    return { width: Math.min(60, Math.max(10, max + 2)) };
  });
  const headerRow = table.headers.map((value) => ({
    value,
    fontWeight: "bold" as const,
    backgroundColor: "#eeeeee",
  }));
  const dataRows = table.rows.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return null;
      if (cell instanceof Date) {
        return Number.isNaN(cell.getTime()) ? null : { value: cell, format: "dd/mm/yyyy hh:mm" };
      }
      if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
      if (typeof cell === "boolean") return cell ? "Oui" : "Non";
      return cell;
    }),
  );
  const safeSheet = sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Export";
  await writeXlsxFile([headerRow, ...dataRows] as never, {
    sheet: safeSheet,
    columns: widths,
    stickyRowsCount: 1,
  }).toFile(fileName);
}

/** Vue d'impression dans un iframe masqué puis window.print() (« Enregistrer au format PDF »). */
export function printTable(table: ExportTable, options: PrintOptions): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const cleanup = () => iframe.remove();
  iframe.addEventListener("load", () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener("afterprint", () => setTimeout(cleanup, 500));
    win.focus();
    win.print();
    setTimeout(cleanup, 120_000);
  });
  iframe.srcdoc = buildPrintHtml(table, options);
  document.body.appendChild(iframe);
}
