"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";

interface DataTablePaginationProps {
  /** Page courante, à partir de 1. */
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  /** Nombre de résultats (après recherche en mode client). */
  total: number;
  /** Nombre de lignes avant recherche, affiché « (filtrés sur N) » quand une recherche est active. */
  unfilteredTotal?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
}

export function DataTablePagination({
  page,
  pageSize,
  pageSizeOptions,
  total,
  unfilteredTotal,
  onPageChange,
  onPageSizeChange,
  disabled,
}: DataTablePaginationProps) {
  const labelId = useId();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const resultsLabel = total > 1 ? "résultats" : "résultat";
  const wide = "flex-1 sm:flex-none";

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 text-sm lg:flex-row lg:items-center lg:justify-between">
      <p className="text-muted-foreground">
        {total === 0 ? (
          "Aucun résultat"
        ) : (
          <>
            Affichage de {formatNumber(first)} à {formatNumber(last)} sur {formatNumber(total)} {resultsLabel}
          </>
        )}
        {unfilteredTotal !== undefined && unfilteredTotal !== total && <> (filtrés sur {formatNumber(unfilteredTotal)})</>}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <span id={labelId} className="whitespace-nowrap text-muted-foreground">
            Lignes par page
          </span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))} disabled={disabled}>
            <SelectTrigger aria-labelledby={labelId} className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Première page"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} className={wide}>
            <ChevronLeft className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            Précédent
          </Button>
          <span
            className="order-first basis-full whitespace-nowrap text-center tabular-nums sm:order-none sm:min-w-[6.5rem] sm:basis-auto"
            aria-current="page"
          >
            Page {page} sur {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className={wide}
          >
            Suivant
            <ChevronRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Dernière page"
            disabled={disabled || page >= pageCount}
            onClick={() => onPageChange(pageCount)}
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
