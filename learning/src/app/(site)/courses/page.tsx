import type { Metadata } from "next";

import { ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCatalogue } from "@/features/catalogue/api/catalogue.server";
import { CatalogueFilters } from "@/features/catalogue/components/CatalogueFilters";
import { CatalogueEmptyState } from "@/features/catalogue/components/CatalogueEmptyState";
import { CataloguePagination } from "@/features/catalogue/components/CataloguePagination";
import { CourseCard } from "@/features/catalogue/components/CourseCard";
import { hasActiveFilters, parseCatalogueFilters } from "@/features/catalogue/lib/catalogue-filters";
import type { RawSearchParams } from "@/features/catalogue/lib/catalogue-filters";
import { getTenantProfile } from "@/features/tenant/tenant.server";
import { getCopy } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [copy, tenant, params] = await Promise.all([getCopy(), getTenantProfile(), searchParams]);
  const { filters } = parseCatalogueFilters(params);
  const title = `${copy.catalogue.title} · ${tenant.name}`;
  return {
    title,
    description: copy.catalogue.subtitle,
    // Les variantes filtrées/paginées ne sont pas indexées : la page canonique est le catalogue nu.
    alternates: { canonical: "/courses" },
    robots: hasActiveFilters(filters) || filters.page > 1 || filters.sort !== "recent" ? { index: false, follow: true } : undefined,
    openGraph: { title, description: copy.catalogue.subtitle, type: "website", siteName: tenant.name },
    twitter: { card: "summary", title, description: copy.catalogue.subtitle },
  };
}

/** Catalogue public : Server Component (SEO), filtres et pagination portés par l'URL. */
export default async function CataloguePage({ searchParams }: PageProps) {
  const { filters, invalid } = parseCatalogueFilters(await searchParams);
  const [result, copy] = await Promise.all([getCatalogue(filters), getCopy()]);

  return (
    <>
      <PageHeader title={copy.catalogue.title} subtitle={copy.catalogue.subtitle} />
      {invalid && (
        <p role="status" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.vitrine.filters.invalid}
        </p>
      )}
      {!result.ok ? (
        <ErrorState title={copy.catalogue.errorTitle} detail={`${result.message} ${copy.vitrine.catalogue.reloadHint}`} />
      ) : (
        <div className="flex flex-col gap-5">
          <CatalogueFilters copy={copy} filters={filters} facets={result.data.facets} />
          <p className="text-sm text-subtle" aria-live="polite">
            {copy.catalogue.resultCount(result.data.total)}
          </p>
          {result.data.items.length === 0 ? (
            <CatalogueEmptyState
              message={hasActiveFilters(filters) ? copy.catalogue.noResults : copy.catalogue.empty}
              action={hasActiveFilters(filters) ? { href: "/courses", label: copy.vitrine.filters.reset } : undefined}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.items.map((course, index) => (
                <CourseCard key={course.id} course={course} priority={index < 3} />
              ))}
            </ul>
          )}
          <CataloguePagination copy={copy} filters={filters} page={result.data.page} totalPages={result.data.totalPages} />
        </div>
      )}
    </>
  );
}
