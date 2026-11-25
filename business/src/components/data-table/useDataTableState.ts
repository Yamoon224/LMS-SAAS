"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { filterRows, isSortable, sortRows } from "./export";
import type { DataTableColumn, DataTableServerOptions, SortState } from "./types";

export const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

interface PersistedState {
  pageSize?: number;
  hidden?: string[];
  sort?: SortState | null;
}

function storageKey(stateKey: string) {
  return `dt:${stateKey}`;
}

function readPersisted(stateKey: string | undefined): PersistedState | null {
  if (!stateKey) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(stateKey));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PersistedState) : null;
  } catch {
    return null;
  }
}

function writePersisted(stateKey: string | undefined, state: PersistedState) {
  if (!stateKey) return;
  try {
    window.localStorage.setItem(storageKey(stateKey), JSON.stringify(state));
  } catch {
    /* stockage indisponible (navigation privée, quota) : on ignore */
  }
}

interface Options<T> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  stateKey?: string;
  initialSort?: SortState;
  pageSizeOptions: number[];
  server?: DataTableServerOptions<T>;
}

export function useDataTableState<T>({ data, columns, stateKey, initialSort, pageSizeOptions, server }: Options<T>) {
  const isServer = Boolean(server);
  const defaultPageSize = pageSizeOptions.includes(10) ? 10 : (pageSizeOptions[0] ?? 10);

  const [search, setSearchState] = useState("");
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [pageIndex, setPageIndex] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);
  const [hidden, setHidden] = useState<string[]>(() =>
    columns.filter((c) => c.defaultHidden).map((c) => c.id),
  );
  const [hydrated, setHydrated] = useState(false);
  const serverRef = useRef(server);
  serverRef.current = server;

  /* Restauration après montage (évite tout écart d'hydratation SSR). */
  useEffect(() => {
    const saved = readPersisted(stateKey);
    if (saved) {
      if (typeof saved.pageSize === "number" && pageSizeOptions.includes(saved.pageSize)) {
        setLocalPageSize(saved.pageSize);
        if (serverRef.current && serverRef.current.pageSize !== saved.pageSize) {
          serverRef.current.onPageSizeChange(saved.pageSize);
        }
      }
      if (Array.isArray(saved.hidden)) {
        const known = new Set(columns.map((c) => c.id));
        setHidden(saved.hidden.filter((id): id is string => typeof id === "string" && known.has(id)));
      }
      if ("sort" in saved) {
        setSort(
          saved.sort && columns.some((c) => c.id === saved.sort?.columnId) ? saved.sort : null,
        );
      }
    }
    setHydrated(true);
    // Restauration unique au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageSize = server ? server.pageSize : localPageSize;

  useEffect(() => {
    // N'écrit qu'après la restauration (même rendu que les valeurs restaurées), sinon les défauts l'écraseraient.
    if (!hydrated) return;
    writePersisted(stateKey, { pageSize, hidden, sort });
  }, [hydrated, stateKey, pageSize, hidden, sort]);

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.includes(c.id)), [columns, hidden]);

  /* ---- Mode client : recherche, tri, pagination --------------------- */
  const filtered = useMemo(
    () => (isServer || !data ? [] : filterRows(data, columns, search)),
    [isServer, data, columns, search],
  );
  const sorted = useMemo(() => (isServer ? [] : sortRows(filtered, columns, sort)), [isServer, filtered, columns, sort]);

  const total = server ? server.total : sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = server ? Math.min(Math.max(1, server.page), pageCount) : Math.min(pageIndex, pageCount);

  // Recale la page si les données se réduisent.
  useEffect(() => {
    if (!isServer && pageIndex > pageCount) setPageIndex(pageCount);
  }, [isServer, pageIndex, pageCount]);

  const rows = useMemo(() => {
    if (isServer) return data ?? [];
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [isServer, data, sorted, page, pageSize]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPageIndex(1);
  }, []);

  const setPage = useCallback(
    (next: number) => {
      const bounded = Math.min(Math.max(1, next), pageCount);
      if (serverRef.current) serverRef.current.onPageChange(bounded);
      else setPageIndex(bounded);
    },
    [pageCount],
  );

  const setPageSize = useCallback((size: number) => {
    setPageIndex(1);
    if (serverRef.current) {
      serverRef.current.onPageSizeChange(size);
      serverRef.current.onPageChange(1);
    } else {
      setLocalPageSize(size);
    }
  }, []);

  /** asc → desc → aucun */
  const toggleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((c) => c.id === columnId);
      if (!column || !isSortable(column) || isServer) return;
      setSort((current) => {
        if (!current || current.columnId !== columnId) return { columnId, direction: "asc" };
        if (current.direction === "asc") return { columnId, direction: "desc" };
        return null;
      });
      setPageIndex(1);
    },
    [columns, isServer],
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      setHidden((current) => {
        if (current.includes(columnId)) return current.filter((id) => id !== columnId);
        const remaining = columns.filter((c) => !current.includes(c.id) && c.id !== columnId);
        return remaining.length === 0 ? current : [...current, columnId];
      });
    },
    [columns],
  );

  const showAllColumns = useCallback(() => setHidden([]), []);

  const searchText = server ? server.search : search;
  const onSearch = server ? server.onSearchChange : setSearch;

  return {
    searchText,
    onSearch,
    sort,
    toggleSort,
    page,
    pageCount,
    pageSize,
    setPage,
    setPageSize,
    hidden,
    visibleColumns,
    toggleColumn,
    showAllColumns,
    /** Lignes de la page courante. */
    rows,
    /** Toutes les lignes filtrées + triées (client) – utilisées pour l'export. */
    allFilteredRows: sorted,
    filteredCount: total,
    unfilteredCount: server ? server.total : (data?.length ?? 0),
  };
}
