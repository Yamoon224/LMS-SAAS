"use client";

import { Inbox, SearchX } from "lucide-react";
import type * as React from "react";

import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";
import { DataTableCards } from "./DataTableCards";
import { DataTableGrid } from "./DataTableGrid";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import { ExportMenu } from "./ExportMenu";
import type { DataTableProps, ExportFormat } from "./types";
import { useDataTableExport } from "./useDataTableExport";
import { DEFAULT_PAGE_SIZES, useDataTableState } from "./useDataTableState";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { MobileCardList } from "@/components/ui/mobile-card-list";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_EXPORTS: ExportFormat[] = ["csv", "xlsx", "pdf"];

function LoadingSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <>
      <div
        className="hidden overflow-hidden rounded-md border border-border bg-surface shadow-card md:block"
        role="status"
        aria-label="Chargement"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-4 border-b border-border px-4 py-4 last:border-0">
            {Array.from({ length: columnCount }, (_, col) => (
              <Skeleton key={col} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
      <MobileCardList className="md:hidden" aria-label="Chargement">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="rounded-md border border-border bg-surface p-4 shadow-card">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </li>
        ))}
      </MobileCardList>
    </>
  );
}

function NoResult({ searchText, onClear }: { searchText: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      message={searchText ? `Aucun résultat pour « ${searchText} ».` : "Aucun résultat avec les filtres actuels."}
      action={
        searchText ? (
          <Button type="button" variant="outline" onClick={onClear}>
            Effacer la recherche
          </Button>
        ) : undefined
      }
    />
  );
}

interface ToolbarActionsProps<T> {
  showMenus: boolean;
  columns: DataTableProps<T>["columns"];
  hidden: string[];
  onToggle: (id: string) => void;
  onShowAll: () => void;
  exports: ExportFormat[];
  exporting: boolean;
  exportDisabled: boolean;
  onExport: (format: ExportFormat) => void;
  extra?: React.ReactNode;
}

function ToolbarActions<T>(props: ToolbarActionsProps<T>) {
  return (
    <>
      {props.showMenus && (
        <>
          <ColumnVisibilityMenu
            columns={props.columns}
            hidden={props.hidden}
            onToggle={props.onToggle}
            onShowAll={props.onShowAll}
          />
          <ExportMenu
            formats={props.exports}
            busy={props.exporting}
            disabled={props.exportDisabled}
            onExport={props.onExport}
          />
        </>
      )}
      {props.extra}
    </>
  );
}

function liveLabel(settled: boolean, count: number): string {
  if (!settled) return "";
  return `${count} résultat${count > 1 ? "s" : ""}`;
}

type TableStatus = "error" | "loading" | "empty" | "noresult" | "rows";

function getStatus(opts: { error: unknown; isLoading?: boolean; dataLength: number; searchText: string; rowCount: number; serverTotal?: number }): TableStatus {
  if (opts.error) return "error";
  if (opts.isLoading) return "loading";
  const serverEmpty = opts.serverTotal === undefined || opts.serverTotal === 0;
  if (opts.dataLength === 0 && !opts.searchText && serverEmpty) return "empty";
  return opts.rowCount === 0 ? "noresult" : "rows";
}

/** Valeurs par défaut de l'API publique (isolées pour garder DataTable lisible). */
function withDefaults<T>(props: DataTableProps<T>) {
  return {
    ...props,
    searchPlaceholder: props.searchPlaceholder ?? "Rechercher…",
    pageSizeOptions: props.pageSizeOptions ?? DEFAULT_PAGE_SIZES,
    exports: props.exports ?? ALL_EXPORTS,
    exportTitle: props.title ?? "export",
    debounceMs: props.server ? 300 : 0,
  };
}

export function DataTable<T>(props: DataTableProps<T>) {
  const p = withDefaults(props);
  const { data, columns, isLoading, server, rowActions } = p;
  const state = useDataTableState<T>({
    data,
    columns,
    stateKey: p.stateKey,
    initialSort: p.initialSort,
    pageSizeOptions: p.pageSizeOptions,
    server,
  });
  const { visibleColumns, rows } = state;
  const { searchText } = state;
  const { exporting, exportAs } = useDataTableExport<T>({
    title: p.exportTitle,
    searchText,
    data,
    allFilteredRows: state.allFilteredRows,
    visibleColumns,
    server,
  });

  const status = getStatus({
    error: p.error,
    isLoading,
    dataLength: data?.length ?? 0,
    searchText,
    rowCount: rows.length,
    serverTotal: server?.total,
  });
  const settled = status !== "error" && status !== "loading";
  const noData = status === "empty";

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        value={searchText}
        onChange={state.onSearch}
        placeholder={p.searchPlaceholder}
        debounceMs={p.debounceMs}
        showSearch={!noData}
        filters={p.filters}
        actions={
          <ToolbarActions
            showMenus={status !== "error" && !noData}
            columns={columns}
            hidden={state.hidden}
            onToggle={state.toggleColumn}
            onShowAll={state.showAllColumns}
            exports={p.exports}
            exporting={exporting}
            exportDisabled={status === "loading"}
            onExport={(format) => void exportAs(format)}
            extra={p.toolbarActions}
          />
        }
      />

      <p className="sr-only" role="status" aria-live="polite">
        {liveLabel(settled, state.filteredCount)}
      </p>

      {status === "error" && <ErrorBanner title="Impossible de charger les données." error={p.error} onRetry={p.onRetry} />}
      {status === "loading" && <LoadingSkeleton columnCount={visibleColumns.length} />}
      {noData && (p.emptyState ?? <EmptyState icon={Inbox} message="Aucune donnée pour le moment." />)}
      {status === "noresult" && <NoResult searchText={searchText} onClear={() => state.onSearch("")} />}

      {status === "rows" && (
        <>
          <DataTableGrid
            title={p.title}
            rows={rows}
            columns={visibleColumns}
            getRowId={p.getRowId}
            rowActions={rowActions}
            onRowClick={p.onRowClick}
            sort={state.sort}
            sortingEnabled={!server}
            onSort={state.toggleSort}
          />
          <DataTableCards rows={rows} columns={visibleColumns} getRowId={p.getRowId} rowActions={rowActions} />
        </>
      )}

      {settled && !noData && (
        <DataTablePagination
          page={state.page}
          pageCount={state.pageCount}
          pageSize={state.pageSize}
          pageSizeOptions={p.pageSizeOptions}
          total={state.filteredCount}
          unfilteredTotal={state.unfilteredCount}
          shown={rows.length}
          compact={state.unfilteredCount <= Math.min(...p.pageSizeOptions)}
          onPageChange={state.setPage}
          onPageSizeChange={state.setPageSize}
        />
      )}
    </div>
  );
}
