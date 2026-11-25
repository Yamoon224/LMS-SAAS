"use client";

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";

import type { ExportFormat } from "./types";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  formats: ExportFormat[];
  disabled?: boolean;
  busy?: boolean;
  onExport: (format: ExportFormat) => void;
}

export function ExportMenu({ formats, disabled, busy, onExport }: ExportMenuProps) {
  if (formats.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled || busy} aria-busy={busy}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {busy ? "Export…" : "Exporter"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {formats.includes("csv") && (
          <DropdownMenuItem onSelect={() => onExport("csv")}>
            <FileText /> CSV (.csv)
          </DropdownMenuItem>
        )}
        {formats.includes("xlsx") && (
          <DropdownMenuItem onSelect={() => onExport("xlsx")}>
            <FileSpreadsheet /> Excel (.xlsx)
          </DropdownMenuItem>
        )}
        {formats.includes("pdf") && (
          <DropdownMenuItem onSelect={() => onExport("pdf")}>
            <Printer /> PDF (imprimer)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
