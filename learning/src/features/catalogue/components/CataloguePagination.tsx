import Link from "next/link";

import { catalogueHref } from "../lib/catalogue-filters";
import type { CatalogueFilters } from "../lib/catalogue-filters";

import type { Copy } from "@/lib/i18n/types";

const linkClass =
  "flex min-h-[44px] items-center rounded-lg border border-line bg-card px-4 text-sm font-medium hover:text-primary";
const disabledClass = "flex min-h-[44px] items-center rounded-lg border border-line px-4 text-sm text-subtle opacity-50";

/** Pagination par liens (rendu serveur, indexable, partageable). */
export function CataloguePagination({
  copy,
  filters,
  page,
  totalPages,
}: {
  copy: Copy;
  filters: CatalogueFilters;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const t = copy.vitrine.pagination;
  return (
    <nav aria-label={t.label} className="flex flex-wrap items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={catalogueHref(filters, { page: page - 1 })} rel="prev" className={linkClass}>
          <span aria-hidden="true" className="me-2 inline-block rtl:rotate-180">←</span>
          {t.previous}
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          <span aria-hidden="true" className="me-2 inline-block rtl:rotate-180">←</span>
          {t.previous}
        </span>
      )}
      <span className="text-sm text-subtle" aria-live="polite">
        {t.page(page, totalPages)}
      </span>
      {page < totalPages ? (
        <Link href={catalogueHref(filters, { page: page + 1 })} rel="next" className={linkClass}>
          {t.next}
          <span aria-hidden="true" className="ms-2 inline-block rtl:rotate-180">→</span>
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          {t.next}
          <span aria-hidden="true" className="ms-2 inline-block rtl:rotate-180">→</span>
        </span>
      )}
    </nav>
  );
}
