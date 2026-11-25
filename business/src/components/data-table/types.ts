import type * as React from "react";

export type CellPrimitive = string | number | boolean | Date | null | undefined;

export interface DataTableColumn<T> {
  /** Clé stable. */
  id: string;
  /** Libellé français : en-tête, menu des colonnes et exports. */
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Valeur pour recherche, tri et export (repli : version texte de `cell` si primitive). */
  accessor?: (row: T) => CellPrimitive;
  /** Remplace `accessor` pour les exports (dates / montants / statuts lisibles). */
  exportValue?: (row: T) => string | number | null;
  /** Par défaut true si `accessor` existe. */
  sortable?: boolean;
  /** Par défaut true si `accessor` existe. */
  searchable?: boolean;
  /** Par défaut true. */
  hideable?: boolean;
  defaultHidden?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  /** Rôle dans la disposition en cartes (mobile). */
  mobile?: "primary" | "secondary" | "hidden";
}

export interface DataTableServerOptions<T> {
  total: number;
  /** Numéro de page, base 1. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  /** Appelé après 300 ms de debounce. */
  onSearchChange: (q: string) => void;
  /** Charge tout ce qui correspond aux filtres courants (plafonné à 5000 lignes). */
  fetchAllForExport?: () => Promise<T[]>;
}

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface DataTableProps<T> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Nom utilisé dans les fichiers d'export et l'en-tête d'impression (ex. « formations »). */
  title?: string;
  searchPlaceholder?: string;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  filters?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  pageSizeOptions?: number[];
  initialSort?: { columnId: string; direction: "asc" | "desc" };
  emptyState?: React.ReactNode;
  exports?: ExportFormat[];
  server?: DataTableServerOptions<T>;
  /** Persiste taille de page, colonnes visibles et tri sous `dt:<stateKey>`. */
  stateKey?: string;
}

export type SortDirection = "asc" | "desc";
export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export type ExportCell = string | number | boolean | Date | null;
export interface ExportTable {
  headers: string[];
  rows: ExportCell[][];
}
