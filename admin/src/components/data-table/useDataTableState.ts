"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SortDirection } from "./types";

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

interface PersistedState {
  pageSize?: number;
  hidden?: string[];
  sort?: SortState | null;
}

interface Options {
  stateKey?: string;
  defaultPageSize: number;
  pageSizeOptions: number[];
  defaultHidden: string[];
  initialSort?: SortState;
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
    return typeof parsed === "object" && parsed !== null ? (parsed as PersistedState) : null;
  } catch {
    return null;
  }
}

function writePersisted(stateKey: string, state: PersistedState) {
  try {
    window.localStorage.setItem(storageKey(stateKey), JSON.stringify(state));
  } catch {
    // stockage indisponible (navigation privée, quota) : l'état reste en mémoire
  }
}

/** État du tableau : page, recherche (mode client), taille de page, colonnes masquées et tri ; préférences persistées sous `dt:<stateKey>`. */
export function useDataTableState({ stateKey, defaultPageSize, pageSizeOptions, defaultHidden, initialSort }: Options) {
  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState("");
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [hiddenIds, setHiddenIds] = useState<string[]>(defaultHidden);
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [hydrated, setHydrated] = useState(false);

  // Lecture après montage (évite tout écart d'hydratation SSR / client).
  useEffect(() => {
    const stored = readPersisted(stateKey);
    if (stored) {
      if (typeof stored.pageSize === "number" && pageSizeOptions.includes(stored.pageSize)) setPageSizeState(stored.pageSize);
      if (Array.isArray(stored.hidden)) setHiddenIds(stored.hidden.filter((id): id is string => typeof id === "string"));
      if (stored.sort === null) setSort(null);
      else if (stored.sort && typeof stored.sort.columnId === "string") setSort(stored.sort);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lecture unique au montage
  }, [stateKey]);

  useEffect(() => {
    if (!hydrated || !stateKey) return;
    writePersisted(stateKey, { pageSize, hidden: hiddenIds, sort });
  }, [hydrated, stateKey, pageSize, hiddenIds, sort]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  /** asc → desc → aucun tri. */
  const toggleSort = useCallback((columnId: string) => {
    setSort((current) => {
      if (!current || current.columnId !== columnId) return { columnId, direction: "asc" };
      if (current.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
    setPage(1);
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    setHiddenIds((current) => (current.includes(columnId) ? current.filter((id) => id !== columnId) : [...current, columnId]));
  }, []);

  const resetColumns = useCallback(() => setHiddenIds(defaultHidden), [defaultHidden]);

  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  return { hydrated, page, setPage, search, setSearch, pageSize, setPageSize, hidden, toggleColumn, resetColumns, sort, toggleSort };
}
