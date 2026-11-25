"use client";

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useState } from "react";

import { buildExportRows, buildFileName, buildPrintHtml, toCsv } from "./export";
import type { ExportTable } from "./export";
import type { DataTableColumn, ExportFormat } from "./types";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

export interface ExportSource<T> {
  rows: T[];
  /** Vrai si la liste a été tronquée au plafond d'export. */
  capped: boolean;
}

interface ExportMenuProps<T> {
  formats: ExportFormat[];
  title?: string;
  search: string;
  /** Colonnes visibles uniquement (sans colonne d'actions). */
  columns: DataTableColumn<T>[];
  /** Toutes les lignes correspondant à la recherche / aux filtres courants (pas seulement la page). */
  getSource: () => Promise<ExportSource<T>>;
  disabled?: boolean;
}

const FORMAT_ITEMS: Record<ExportFormat, { label: string; icon: typeof FileText }> = {
  csv: { label: "CSV (Excel, séparateur ;)", icon: FileText },
  xlsx: { label: "Excel (.xlsx)", icon: FileSpreadsheet },
  pdf: { label: "PDF (impression)", icon: Printer },
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function exportCsv(table: ExportTable, title: string | undefined) {
  const blob = new Blob([toCsv(table.headers, table.rows)], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, buildFileName(title, "csv"));
}

/** XLSX : bibliothèque chargée à la demande (aucun octet ajouté au bundle initial). */
async function exportXlsx(table: ExportTable, title: string | undefined) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const dateFormat = "dd/mm/yyyy hh:mm";
  const header = table.headers.map((value) => ({ value, fontWeight: "bold" as const }));
  const body = table.rows.map((row) =>
    row.map((cell) => (cell instanceof Date ? { value: cell, format: dateFormat } : cell)),
  );
  const widths = table.headers.map((headerText, index) => {
    const longest = table.rows.reduce((max, row) => {
      const cell = row[index];
      const length = cell instanceof Date ? 16 : cell === null ? 0 : String(cell).length;
      return Math.max(max, length);
    }, headerText.length);
    return { width: Math.min(Math.max(longest + 2, 10), 50) };
  });
  const sheetName = (title ?? "Export").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Export";
  const blob = await writeXlsxFile([header, ...body], { sheet: sheetName, columns: widths, stickyRowsCount: 1 }).toBlob();
  downloadBlob(blob, buildFileName(title, "xlsx"));
}

/** PDF : vue d'impression dédiée dans un iframe masqué, puis window.print() (« Enregistrer au format PDF »). */
function exportPdf(table: ExportTable, title: string | undefined, search: string, capNotice: string | undefined) {
  const html = buildPrintHtml({ title: title ?? "export", generatedAt: new Date(), search: search.trim() || undefined, table, capNotice });
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  iframe.srcdoc = html;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      iframe.remove();
      return;
    }
    frameWindow.addEventListener("afterprint", cleanup);
    frameWindow.focus();
    frameWindow.print();
    // Filet de sécurité si « afterprint » n'est jamais émis.
    setTimeout(() => iframe.remove(), 5 * 60_000);
  };
  document.body.appendChild(iframe);
}

/** Menu « Exporter » : CSV, XLSX, PDF. Exporte toutes les lignes filtrées, colonnes visibles uniquement. */
export function ExportMenu<T>({ formats, title, search, columns, getSource, disabled }: ExportMenuProps<T>) {
  const [busy, setBusy] = useState(false);
  if (formats.length === 0) return null;

  async function run(format: ExportFormat) {
    setBusy(true);
    try {
      const source = await getSource();
      const table = buildExportRows(source.rows, columns);
      const capNotice = source.capped ? `Export limité aux ${source.rows.length} premières lignes.` : undefined;
      if (format === "csv") exportCsv(table, title);
      else if (format === "xlsx") await exportXlsx(table, title);
      else exportPdf(table, title, search, capNotice);
      const count = table.rows.length;
      toast.success(`Export prêt (${count} ${count > 1 ? "lignes" : "ligne"})`);
      if (capNotice) toast.info(`${capNotice} Affinez les filtres pour exporter le reste.`);
    } catch (error) {
      toast.error(error, "L’export a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled || busy} aria-busy={busy}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {busy ? "Export…" : "Exporter"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {formats.map((format) => {
          const { label, icon: Icon } = FORMAT_ITEMS[format];
          return (
            <DropdownMenuItem key={format} onSelect={() => void run(format)}>
              <Icon /> {label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
