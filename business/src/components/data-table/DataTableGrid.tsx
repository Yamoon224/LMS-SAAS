"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type * as React from "react";

import { isSortable } from "./export";
import type { DataTableColumn, SortState } from "./types";

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

interface DataTableGridProps<T> {
  title?: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  sort: SortState | null;
  sortingEnabled: boolean;
  onSort: (columnId: string) => void;
}

/** Tableau (≥ md) : conteneur défilant, en-tête collant, 1re colonne collante. */
export function DataTableGrid<T>({
  title,
  rows,
  columns,
  getRowId,
  rowActions,
  onRowClick,
  sort,
  sortingEnabled,
  onSort,
}: DataTableGridProps<T>) {
  return (
    <div className="hidden max-h-[80vh] overflow-auto rounded-md border border-border bg-surface shadow-card md:block">
      <table className="table-sm table-striped w-full caption-bottom text-sm">
        <caption className="sr-only">{title ?? "Tableau de données"}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column, index) => (
              <SortableHead
                key={column.id}
                column={column}
                first={index === 0}
                active={sort?.columnId === column.id ? sort.direction : null}
                sortable={sortingEnabled && isSortable(column)}
                onSort={() => onSort(column.id)}
              />
            ))}
            {rowActions && (
              <TableHead className="sticky top-0 z-10 w-12 bg-brand text-right text-brand-foreground">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getRowId(row)}
              className={cn("group hover:bg-accent", onRowClick && "cursor-pointer")}
              onClick={
                onRowClick
                  ? (event) => {
                      if ((event.target as HTMLElement).closest("a,button,input,select,[role=menuitem]")) return;
                      onRowClick(row);
                    }
                  : undefined
              }
            >
              {columns.map((column, index) => (
                <TableCell
                  key={column.id}
                  className={cn(
                    ALIGN[column.align ?? "left"],
                    index === 0 && "sticky left-0 z-[1] bg-surface group-hover:bg-accent",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
              {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}

interface SortableHeadProps<T> {
  column: DataTableColumn<T>;
  first: boolean;
  active: "asc" | "desc" | null;
  sortable: boolean;
  onSort: () => void;
}

function ariaSort(active: "asc" | "desc" | null): "ascending" | "descending" | "none" {
  if (active === "asc") return "ascending";
  if (active === "desc") return "descending";
  return "none";
}

function SortableHead<T>({ column, first, active, sortable, onSort }: SortableHeadProps<T>) {
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead
      scope="col"
      aria-sort={sortable ? ariaSort(active) : undefined}
      className={cn(
        "sticky top-0 bg-brand text-brand-foreground",
        first ? "left-0 z-20" : "z-10",
        ALIGN[column.align ?? "left"],
        column.className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "-mx-2 inline-flex min-h-8 items-center gap-1 rounded-md px-2 uppercase tracking-wide hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            column.align === "right" && "flex-row-reverse",
          )}
        >
          {column.header}
          <Icon className={cn("h-3.5 w-3.5", active ? "text-foreground" : "opacity-40")} aria-hidden="true" />
        </button>
      ) : (
        column.header
      )}
    </TableHead>
  );
}
