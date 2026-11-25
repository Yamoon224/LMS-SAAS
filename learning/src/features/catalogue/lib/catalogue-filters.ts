/**
 * PUB-02 : état des filtres du catalogue, porté par l'URL (liens partageables, rendu serveur). Fonctions pures.
 * Les valeurs hors liste blanche sont écartées (et signalées) : l'écran reste utilisable, le backend reste la
 * source de vérité (il répond 400 à un paramètre invalide).
 */

export const CATALOGUE_SORTS = ["recent", "price_asc", "price_desc", "title", "duration_asc", "duration_desc"] as const;
export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

export const PRICE_FILTERS = ["free", "paid"] as const;
export type PriceFilter = (typeof PRICE_FILTERS)[number];

export const CATALOGUE_PAGE_SIZE = 12;
const MAX_TEXT = 100;

export interface CatalogueFilters {
  category?: string;
  language?: string;
  level?: string;
  price?: PriceFilter;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  sort: CatalogueSort;
  page: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface ParsedFilters {
  filters: CatalogueFilters;
  /** Vrai si au moins un paramètre de l'adresse était invalide et a été ignoré. */
  invalid: boolean;
}

function text(value: string | string[] | undefined): string | undefined | null {
  if (value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_TEXT ? null : trimmed;
}

function integer(value: string | string[] | undefined, min: number, max: number): number | undefined | null {
  const raw = text(value);
  if (raw === undefined || raw === null) return raw;
  if (!/^\d{1,10}$/.test(raw)) return null;
  const parsed = Number(raw);
  return parsed < min || parsed > max ? null : parsed;
}

const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const LEVEL_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

/** Valeur issue de `text()` restreinte à une liste ou un motif ; `null` si elle est hors règle. */
function checked<T extends string>(value: string | undefined | null, accept: (v: string) => T | undefined): T | undefined | null {
  if (value === undefined || value === null) return value;
  return accept(value) ?? null;
}

function normalizedRange(min: number | undefined, max: number | undefined): { minPrice?: number; maxPrice?: number; invalid: boolean } {
  if (min !== undefined && max !== undefined && min > max) return { invalid: true };
  return { minPrice: min, maxPrice: max, invalid: false };
}

export function parseCatalogueFilters(params: RawSearchParams): ParsedFilters {
  let invalid = false;
  const take = <T>(value: T | undefined | null): T | undefined => {
    if (value === null) {
      invalid = true;
      return undefined;
    }
    return value;
  };

  const range = normalizedRange(
    take(integer(params.minPrice, 0, 2_000_000_000)),
    take(integer(params.maxPrice, 0, 2_000_000_000)),
  );
  const filters: CatalogueFilters = {
    category: take(text(params.category)),
    language: take(checked(text(params.language), (v) => (LANGUAGE_PATTERN.test(v) ? v.toLowerCase() : undefined))),
    level: take(checked(text(params.level), (v) => (LEVEL_PATTERN.test(v) ? v.toUpperCase() : undefined))),
    price: take(checked(text(params.price), (v) => (PRICE_FILTERS as readonly string[]).includes(v) ? (v as PriceFilter) : undefined)),
    minPrice: range.minPrice,
    maxPrice: range.maxPrice,
    q: take(text(params.q)),
    sort:
      take(checked(text(params.sort), (v) => ((CATALOGUE_SORTS as readonly string[]).includes(v) ? (v as CatalogueSort) : undefined))) ??
      "recent",
    page: take(integer(params.page, 1, 10_000)) ?? 1,
  };
  return { filters, invalid: invalid || range.invalid };
}

/** Paramètres d'URL canoniques : valeurs par défaut omises, ordre stable (liens partageables, SEO). */
export function filtersToSearchParams(filters: CatalogueFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.language) params.set("language", filters.language);
  if (filters.level) params.set("level", filters.level);
  if (filters.price) params.set("price", filters.price);
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

/** Lien vers le catalogue avec ces filtres (modifiés par `override`) ; revient à la page 1 si un filtre change. */
export function catalogueHref(filters: CatalogueFilters, override: Partial<CatalogueFilters> = {}, base = "/courses"): string {
  const changesFilter = Object.keys(override).some((key) => key !== "page");
  const next: CatalogueFilters = { ...filters, ...override, page: override.page ?? (changesFilter ? 1 : filters.page) };
  const query = filtersToSearchParams(next).toString();
  return query ? `${base}?${query}` : base;
}

/** Requête envoyée au backend (`GET /public/courses?…`). */
export function filtersToApiQuery(filters: CatalogueFilters, pageSize = CATALOGUE_PAGE_SIZE): string {
  const params = filtersToSearchParams(filters);
  params.set("pageSize", String(pageSize));
  return params.toString();
}

export function hasActiveFilters(filters: CatalogueFilters): boolean {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.language ||
      filters.level ||
      filters.price ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined,
  );
}
