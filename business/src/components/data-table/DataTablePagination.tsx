"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  /** Nombre de résultats (après recherche). */
  total: number;
  /** Nombre avant recherche : affiche « (filtrés sur N) » si différent. */
  unfilteredTotal: number;
  /** Nombre de lignes réellement affichées sur la page. */
  shown: number;
  /** Seule la synthèse est affichée (peu de lignes). */
  compact?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DataTablePagination({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  total,
  unfilteredTotal,
  shown,
  compact,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const labelId = useId();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : from + shown - 1;
  const filtered = unfilteredTotal !== total;
  const plural = total > 1 ? "s" : "";
  const suffix = filtered ? ` (filtrés sur ${unfilteredTotal})` : "";
  const summary = compact
    ? `${total} résultat${plural}${suffix}`
    : `Affichage de ${from} à ${to} sur ${total} résultat${plural}${suffix}`;

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">{summary}</p>
      {!compact && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <span id={labelId} className="whitespace-nowrap text-muted-foreground">
              Lignes par page
            </span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-[4.5rem]" aria-labelledby={labelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-1 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Première page"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden min-[400px]:inline">Précédent</span>
              <span className="sr-only min-[400px]:hidden">Précédent</span>
            </Button>
            <span className="whitespace-nowrap px-2 text-muted-foreground" aria-current="page">
              Page {page} sur {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
            >
              <span className="hidden min-[400px]:inline">Suivant</span>
              <span className="sr-only min-[400px]:hidden">Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Dernière page"
              disabled={page >= pageCount}
              onClick={() => onPageChange(pageCount)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
