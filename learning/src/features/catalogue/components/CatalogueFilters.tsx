import Link from "next/link";

import { catalogueHref } from "../lib/catalogue-filters";
import type { CatalogueFilters as Filters } from "../lib/catalogue-filters";
import type { CataloguePage } from "../schemas/course.schema";

import { LOCALE_NAMES, isLocale } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "min-h-[44px] w-full rounded-lg border border-line bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-subtle">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Filtres du catalogue : formulaire GET natif (fonctionne sans JavaScript, état dans l'URL, liens partageables).
 * Composant serveur : aucune logique côté client.
 */
export function CatalogueFilters({
  copy,
  filters,
  facets,
}: {
  copy: Copy;
  filters: Filters;
  facets: CataloguePage["facets"];
}) {
  const t = copy.vitrine.filters;
  const sorts: [string, string][] = [
    ["recent", t.sortRecent],
    ["price_asc", t.sortPriceAsc],
    ["price_desc", t.sortPriceDesc],
    ["title", t.sortTitle],
    ["duration_asc", t.sortDurationAsc],
    ["duration_desc", t.sortDurationDesc],
  ];

  return (
    <div className="flex flex-col gap-4">
      {facets.categories.length > 0 && (
        <nav aria-label={copy.catalogue.categoryLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[undefined, ...facets.categories.map((c) => c.value)].map((item) => {
            const active = filters.category === item;
            return (
              <Link
                key={item ?? "all"}
                href={catalogueHref(filters, { category: item })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-line bg-card text-subtle hover:text-ink",
                )}
              >
                {item ?? copy.catalogue.allCategories}
              </Link>
            );
          })}
        </nav>
      )}

      <form action="/courses" method="get" role="search" aria-label={t.title} className="grid grid-cols-1 gap-3 rounded-md border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        <div className="sm:col-span-2 lg:col-span-4">
          <Field label={copy.catalogue.searchLabel} htmlFor="f-q">
            <input id="f-q" type="search" name="q" defaultValue={filters.q ?? ""} maxLength={100} placeholder={copy.catalogue.searchPlaceholder} className={fieldClass} />
          </Field>
        </div>
        <Field label={t.language} htmlFor="f-language">
          <select id="f-language" name="language" defaultValue={filters.language ?? ""} className={fieldClass}>
            <option value="">{t.allLanguages}</option>
            {facets.languages.map((facet) => (
              <option key={facet.value} value={facet.value}>
                {isLocale(facet.value) ? LOCALE_NAMES[facet.value] : facet.value.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.level} htmlFor="f-level">
          <select id="f-level" name="level" defaultValue={filters.level ?? ""} className={fieldClass}>
            <option value="">{t.allLevels}</option>
            {facets.levels.map((facet) => (
              <option key={facet.value} value={facet.value}>
                {copy.levels[facet.value] ?? facet.value}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.price} htmlFor="f-price">
          <select id="f-price" name="price" defaultValue={filters.price ?? ""} className={fieldClass}>
            <option value="">{t.priceAll}</option>
            <option value="free">{t.priceFree}</option>
            <option value="paid">{t.pricePaid}</option>
          </select>
        </Field>
        <Field label={t.sort} htmlFor="f-sort">
          <select id="f-sort" name="sort" defaultValue={filters.sort} className={fieldClass}>
            {sorts.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.minPrice} htmlFor="f-min">
          <input id="f-min" placeholder={copy.placeholders.minPrice} type="number" name="minPrice" min={0} inputMode="numeric" defaultValue={filters.minPrice ?? ""} className={fieldClass} />
        </Field>
        <Field label={t.maxPrice} htmlFor="f-max">
          <input id="f-max" placeholder={copy.placeholders.maxPrice} type="number" name="maxPrice" min={0} inputMode="numeric" defaultValue={filters.maxPrice ?? ""} className={fieldClass} />
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="submit" className="min-h-[44px] rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {t.apply}
          </button>
          <Link href="/courses" className="flex min-h-[44px] items-center rounded-lg border border-line px-4 text-sm font-medium text-subtle hover:text-ink">
            {t.reset}
          </Link>
        </div>
      </form>
    </div>
  );
}
