"use client";

import type * as React from "react";

import type { DataTableColumn } from "./types";

import { MobileCard, MobileCardList } from "@/components/ui/mobile-card-list";

interface DataTableCardsProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  rowActions?: (row: T) => React.ReactNode;
}

/** Cartes empilées (< md) : colonne `primary` = titre, les autres (non `hidden`) = lignes libellé / valeur. */
export function DataTableCards<T>({ rows, columns, getRowId, rowActions }: DataTableCardsProps<T>) {
  const primary = columns.find((c) => c.mobile === "primary") ?? columns.find((c) => c.mobile !== "hidden");
  const secondary = columns.filter((c) => c !== primary && c.mobile !== "hidden");
  return (
    <MobileCardList className="md:hidden">
      {rows.map((row) => (
        <MobileCard
          key={getRowId(row)}
          title={primary ? primary.cell(row) : null}
          actions={rowActions ? rowActions(row) : undefined}
          fields={secondary.map((column) => ({ label: column.header, value: column.cell(row) }))}
        />
      ))}
    </MobileCardList>
  );
}
