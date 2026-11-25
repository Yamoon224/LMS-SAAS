"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import { buildSearchText, compareValues, EXPORT_ROW_LIMIT, getColumnValue, isSortable, matchesSearch } from "./export";
import { ExportMenu } from "./ExportMenu";
import type { ExportSource } from "./ExportMenu";
import type { DataTableColumn, DataTableProps, DataTableServerMode } from "./types";
import { useDataTableState } from "./useDataTableState";
import type { SortState } from "./useDataTableState";

import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { Button } from "@/components/ui/button";
import { MobileCard, MobileCardList } from "@/components/ui/mobile-card-list";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_EXPORTS = ["csv", "xlsx", "pdf"] as const;
const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;
const NO_COLUMNS: string[] = [];

/** Classes de bascule tableau (≥ breakpoint) / cartes (en dessous), écrites en entier pour Tailwind. */
const SWITCH = {
  md: { table: "hidden md:block", cards: "md:hidden" },
  lg: { table: "hidden lg:block", cards: "lg:hidden" },
} as const;

interface ClientModelInput<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  search: string;
  sort: SortState | null;
  serverMode: boolean;
}

/** Mode client : recherche puis tri (le découpage en pages se fait ensuite). En mode serveur, les lignes reçues sont gardées telles quelles. */
function useClientRows<T>({ rows, columns, search, sort, serverMode }: ClientModelInput<T>) {
  const filtered = useMemo(() => {
    if (serverMode || !search.trim()) return rows;
    return rows.filter((row) => matchesSearch(buildSearchText(row, columns), search));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `columns` est recréé à chaque rendu par les appelants
  }, [rows, search, serverMode]);

  const sorted = useMemo(() => {
    if (serverMode || !sort) return filtered;
    const column = columns.find((candidate) => candidate.id === sort.columnId);
    if (!column || !isSortable(column)) return filtered;
    return [...filtered].sort((a, b) => compareValues(getColumnValue(column, a), getColumnValue(column, b), sort.direction));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `columns` est recréé à chaque rendu par les appelants
  }, [filtered, sort, serverMode]);

  return sorted;
}

/** Applique une seule fois la taille de page persistée au parent (mode serveur) quand le stockage est lu. */
function useServerPageSizeSync(
  hydrated: boolean,
  persisted: number,
  current: number | undefined,
  onChange: ((size: number) => void) | undefined,
) {
  const done = useRef(false);
  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    if (onChange && current !== undefined && persisted !== current) onChange(persisted);
  }, [hydrated, persisted, current, onChange]);
}

/** Colonnes dont l'id et le drapeau `defaultHidden` ont changé (clé stable : les appelants recréent `columns` à chaque rendu). */
function useDefaultHidden<T>(columns: DataTableColumn<T>[]): string[] {
  const key = columns.map((column) => `${column.id}:${column.defaultHidden ? 1 : 0}`).join("|");
  return useMemo(
    () => (key ? columns.filter((column) => column.defaultHidden).map((column) => column.id) : NO_COLUMNS),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` résume les colonnes concernées
    [key],
  );
}

async function loadExportRows<T>(server: DataTableServerMode<T>, pageRows: T[]): Promise<ExportSource<T>> {
  const all = server.fetchAllForExport ? await server.fetchAllForExport() : pageRows;
  return { rows: all.slice(0, EXPORT_ROW_LIMIT), capped: all.length > EXPORT_ROW_LIMIT };
}

/** Toute la logique du tableau (état, recherche, tri, pagination, source d'export), client ou serveur. */
function useTableModel<T>(props: DataTableProps<T>) {
  const { data, columns, server, pageSizeOptions = DEFAULT_PAGE_SIZES } = props;
  const defaultHidden = useDefaultHidden(columns);
  const state = useDataTableState({
    stateKey: props.stateKey,
    defaultPageSize: server?.pageSize ?? pageSizeOptions[0] ?? 10,
    pageSizeOptions,
    defaultHidden,
    initialSort: props.initialSort,
  });
  useServerPageSizeSync(state.hydrated, state.pageSize, server?.pageSize, server?.onPageSizeChange);

  const rows = data ?? [];
  const search = server ? server.search : state.search;
  const pageSize = server ? server.pageSize : state.pageSize;
  const sorted = useClientRows({ rows, columns, search, sort: state.sort, serverMode: Boolean(server) });
  const total = server ? server.total : sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(server ? server.page : state.page, pageCount);

  return {
    state,
    rows,
    search,
    pageSize,
    total,
    page,
    isSearching: search.trim().length > 0,
    pageRows: server ? rows : sorted.slice((page - 1) * pageSize, page * pageSize),
    visibleColumns: columns.filter((column) => !state.hidden.has(column.id)),
    setSearch: server ? server.onSearchChange : state.setSearch,
    getExportSource: (): Promise<ExportSource<T>> =>
      server ? loadExportRows(server, rows) : Promise.resolve({ rows: sorted, capped: false }),
    changePage(next: number) {
      const clamped = Math.min(Math.max(1, next), pageCount);
      if (server) server.onPageChange(clamped);
      else state.setPage(clamped);
    },
    changePageSize(size: number) {
      state.setPageSize(size);
      server?.onPageSizeChange(size);
    },
  };
}

/**
 * Tableau de données : recherche, tri, pagination, colonnes masquables, exports CSV / XLSX / PDF.
 * Mode client par défaut ; mode serveur si `server` est fourni (recherche / tri / pagination alors gérés par l'appelant).
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const { columns, isLoading, error, server, exports = [...DEFAULT_EXPORTS] } = props;
  const model = useTableModel(props);
  const { state, total } = model;

  if (error && isForbidden(error)) return <AccessDenied />;

  const ready = !isLoading && !error;
  const countLabel = `${formatNumber(total)} ${total > 1 ? "résultats" : "résultat"}`;

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={model.search}
        onSearchChange={model.setSearch}
        debounceMs={server ? 300 : 0}
        placeholder={props.searchPlaceholder}
        filters={props.filters}
        toolbarActions={props.toolbarActions}
        tools={
          <>
            <ColumnVisibilityMenu
              columns={columns.filter((column) => column.hideable !== false)}
              hidden={state.hidden}
              onToggle={state.toggleColumn}
              onReset={state.resetColumns}
            />
            <ExportMenu
              formats={exports}
              title={props.title}
              search={model.search}
              columns={model.visibleColumns}
              getSource={model.getExportSource}
              disabled={!ready || total === 0}
            />
          </>
        }
      />
      <p className="sr-only" aria-live="polite" role="status">
        {ready ? (total === 0 ? "Aucun résultat" : countLabel) : ""}
      </p>
      <ResultsView {...props} model={model} ready={ready} />
    </div>
  );
}

/** Corps : squelette, erreur, état vide, ou table (≥ breakpoint) + cartes (mobile) + pagination. */
function ResultsView<T>(props: DataTableProps<T> & { model: ReturnType<typeof useTableModel<T>>; ready: boolean }) {
  const { model, ready, server, breakpoint = "md", pageSizeOptions = DEFAULT_PAGE_SIZES } = props;
  if (props.isLoading) return <TableSkeleton rows={5} />;
  if (!ready) {
    return <ErrorBanner title={props.errorTitle ?? "Impossible de charger la liste."} error={props.error} onRetry={props.onRetry} />;
  }
  if (model.total === 0) {
    return (
      <EmptyResults
        searching={model.isSearching}
        query={model.search}
        emptyState={props.emptyState}
        onClear={() => model.setSearch("")}
      />
    );
  }
  return (
    <>
      <div className={SWITCH[breakpoint].table}>
        <DataTableGrid
          columns={model.visibleColumns}
          rows={model.pageRows}
          getRowId={props.getRowId}
          rowActions={props.rowActions}
          onRowClick={props.onRowClick}
          sort={server ? null : model.state.sort}
          onSort={server ? undefined : model.state.toggleSort}
        />
      </div>
      <MobileCardList className={SWITCH[breakpoint].cards}>
        {model.pageRows.map((row) => (
          <DataTableCard key={props.getRowId(row)} columns={model.visibleColumns} row={row} rowActions={props.rowActions} />
        ))}
      </MobileCardList>
      <DataTablePagination
        page={model.page}
        pageSize={model.pageSize}
        pageSizeOptions={pageSizeOptions}
        total={model.total}
        unfilteredTotal={!server && model.isSearching ? model.rows.length : undefined}
        onPageChange={model.changePage}
        onPageSizeChange={model.changePageSize}
      />
    </>
  );
}

/** Liste vide : état fourni par la page, ou « aucun résultat pour cette recherche » avec bouton d'effacement. */
function EmptyResults({
  searching,
  query,
  emptyState,
  onClear,
}: {
  searching: boolean;
  query: string;
  emptyState: React.ReactNode;
  onClear: () => void;
}) {
  if (!searching) return <>{emptyState ?? <EmptyState icon={Inbox} message="Aucun élément pour le moment." />}</>;
  return (
    <EmptyState
      icon={SearchX}
      message={`Aucun résultat pour « ${query.trim()} ».`}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Effacer la recherche
        </Button>
      }
    />
  );
}

interface GridProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  sort: { columnId: string; direction: "asc" | "desc" } | null;
  onSort?: (columnId: string) => void;
}

function DataTableGrid<T>({ columns, rows, getRowId, rowActions, onRowClick, sort, onSort }: GridProps<T>) {
  return (
    <div
      className={cn(
        "w-full overflow-auto rounded-md border border-border bg-surface shadow-card",
        // Défilement vertical interne (en-tête collant) seulement pour les longues pages.
        rows.length > 15 && "max-h-[70vh]",
      )}
    >
      <table className="table-sm table-striped w-full caption-bottom text-sm">
        <thead>
          <tr>
            {columns.map((column, index) => {
              const sortable = onSort !== undefined && isSortable(column);
              const active = sort?.columnId === column.id ? sort.direction : null;
              const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={sortable ? (active === "asc" ? "ascending" : active === "desc" ? "descending" : "none") : undefined}
                  className={cn(
                    "sticky top-0 z-10 h-8 whitespace-nowrap border-b border-border bg-brand px-3 align-middle text-xs font-semibold uppercase tracking-wide text-brand-foreground",
                    ALIGN[column.align ?? "left"],
                    index === 0 && "left-0 z-20",
                    column.className,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.id)}
                      className={cn(
                        "-mx-2 inline-flex h-7 items-center gap-1.5 rounded-md px-2 uppercase tracking-wide transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active && "text-foreground",
                      )}
                    >
                      {column.header}
                      <Icon className={cn("h-3.5 w-3.5", !active && "opacity-50")} aria-hidden="true" />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {rowActions && (
              <th scope="col" className="sticky top-0 z-10 h-8 w-12 border-b border-border bg-brand px-3 text-right text-brand-foreground">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              onClick={
                onRowClick
                  ? (event) => {
                      if ((event.target as HTMLElement).closest("a,button,input,select,textarea,[role=menuitem]")) return;
                      onRowClick(row);
                    }
                  : undefined
              }
              className={cn(
                "group border-b border-border transition-colors last:border-0 hover:bg-accent/50",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((column, index) => (
                <td
                  key={column.id}
                  className={cn(
                    "px-3 py-1.5 align-middle",
                    ALIGN[column.align ?? "left"],
                    index === 0 && "sticky left-0 z-[1] bg-surface group-hover:bg-accent",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
              {rowActions && <td className="px-3 py-1.5 text-right align-middle">{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTableCard<T>({
  columns,
  row,
  rowActions,
}: {
  columns: DataTableColumn<T>[];
  row: T;
  rowActions?: (row: T) => React.ReactNode;
}) {
  const shown = columns.filter((column) => column.mobile !== "hidden");
  const primary = shown.find((column) => column.mobile === "primary") ?? shown[0];
  const secondary = shown.filter((column) => column !== primary);
  return (
    <MobileCard
      title={primary ? primary.cell(row) : null}
      actions={rowActions?.(row)}
      fields={secondary.map((column) => ({ label: column.header, value: column.cell(row) }))}
    />
  );
}
