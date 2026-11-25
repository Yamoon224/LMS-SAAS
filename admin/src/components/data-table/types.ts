import type * as React from "react";

export type ColumnValue = string | number | boolean | Date | null | undefined;
export type SortDirection = "asc" | "desc";
export type ExportFormat = "csv" | "xlsx" | "pdf";

/** Valeur d'une cellule exportée (les dates restent typées pour XLSX, formatées pour CSV / PDF). */
export type ExportCell = string | number | Date | null;

export interface DataTableColumn<T> {
  /** Clé stable. */
  id: string;
  /** Libellé français : en-tête, menu des colonnes et exports. */
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Valeur pour la recherche, le tri et l'export (repli : version texte de `cell` si primitive). */
  accessor?: (row: T) => ColumnValue;
  /** Remplace `accessor` pour les exports (dates, montants, libellés de statut lisibles). */
  exportValue?: (row: T) => string | number | null;
  /** Défaut : true si `accessor` existe. */
  sortable?: boolean;
  /** Défaut : true si `accessor` existe. */
  searchable?: boolean;
  /** Défaut : true. */
  hideable?: boolean;
  defaultHidden?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  /** Rôle dans la disposition en cartes (primary = titre de la carte, secondary = ligne clé / valeur). */
  mobile?: "primary" | "secondary" | "hidden";
}

export interface DataTableServerMode<T> {
  total: number;
  /** Page courante, à partir de 1. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  /** Appelé avec 300 ms d'anti-rebond. */
  onSearchChange: (query: string) => void;
  /** Charge toutes les lignes correspondant aux filtres courants (plafonné à 5000 lignes par le composant). */
  fetchAllForExport?: () => Promise<T[]>;
}

export interface DataTableProps<T> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Titre de la liste pour les noms de fichiers d'export et l'en-tête d'impression (ex. « entreprises »). */
  title?: string;
  /** Titre du bandeau d'erreur (ajout optionnel à la spec commune). */
  errorTitle?: string;
  searchPlaceholder?: string;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  filters?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  pageSizeOptions?: number[];
  initialSort?: { columnId: string; direction: SortDirection };
  emptyState?: React.ReactNode;
  exports?: ExportFormat[];
  server?: DataTableServerMode<T>;
  /** Persiste taille de page, colonnes visibles et tri sous `dt:<stateKey>` (localStorage). */
  stateKey?: string;
  /** Point de bascule tableau / cartes (défaut : md). */
  breakpoint?: "md" | "lg";
}
