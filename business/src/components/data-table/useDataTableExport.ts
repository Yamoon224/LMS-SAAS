"use client";

import { useState } from "react";

import { buildExportRows, downloadCsv, downloadXlsx, exportFileName, printTable } from "./export";
import type { DataTableColumn, DataTableServerOptions, ExportFormat } from "./types";

import { toast } from "@/components/ui/toast";

export const EXPORT_CAP = 5000;

interface Options<T> {
  title: string;
  searchText: string;
  data: T[] | undefined;
  /** Mode client : toutes les lignes filtrées + triées. */
  allFilteredRows: T[];
  visibleColumns: DataTableColumn<T>[];
  server?: DataTableServerOptions<T>;
}

/** Export CSV / XLSX / PDF de TOUTES les lignes correspondant à la recherche et aux filtres, colonnes visibles uniquement. */
export function useDataTableExport<T>({ title, searchText, data, allFilteredRows, visibleColumns, server }: Options<T>) {
  const [exporting, setExporting] = useState(false);

  async function loadRows(): Promise<{ source: T[]; capped: boolean }> {
    if (!server) return { source: allFilteredRows, capped: false };
    if (!server.fetchAllForExport) return { source: data ?? [], capped: false };
    const all = await server.fetchAllForExport();
    return { source: all.slice(0, EXPORT_CAP), capped: server.total > EXPORT_CAP && all.length >= EXPORT_CAP };
  }

  async function exportAs(format: ExportFormat) {
    setExporting(true);
    try {
      const { source, capped } = await loadRows();
      const table = buildExportRows(source, visibleColumns);
      const stamp = new Date();
      if (format === "csv") downloadCsv(table, exportFileName(title, "csv", stamp));
      else if (format === "xlsx") await downloadXlsx(table, exportFileName(title, "xlsx", stamp), title);
      else printTable(table, { title, search: searchText, generatedAt: stamp });
      const count = table.rows.length;
      toast.success(`Export prêt (${count} ligne${count > 1 ? "s" : ""})`);
      if (capped) {
        toast.info(
          `Export limité aux ${EXPORT_CAP} premières lignes sur ${server?.total ?? EXPORT_CAP}. Affinez vos filtres pour tout obtenir.`,
        );
      }
    } catch (failure) {
      toast.error(failure, "L'export a échoué.");
    } finally {
      setExporting(false);
    }
  }

  return { exporting, exportAs };
}
