import { DomainError } from "@shared/errors";

/**
 * PUB-02 : filtres, tri et pagination du catalogue public. Fonctions pures (aucune dépendance NestJS ni ORM) :
 * les paramètres bruts de l'URL sont validés par `parseCatalogueQuery` (400 si hors liste blanche), puis appliqués
 * à une liste de formations déjà restreinte aux formations PUBLIÉES du tenant courant.
 */

export class InvalidCatalogueQueryError extends DomainError {
  readonly code = "CATALOGUE_PARAMETRE_INVALIDE";
}

export const CATALOGUE_SORTS = ["recent", "price_asc", "price_desc", "title", "duration_asc", "duration_desc"] as const;
export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

export const PRICE_FILTERS = ["free", "paid"] as const;
export type PriceFilter = (typeof PRICE_FILTERS)[number];

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
const MAX_PAGE = 10_000;
const MAX_TEXT_LENGTH = 100;
const MAX_PRICE = 2_000_000_000;

export interface CatalogueQuery {
  category?: string;
  language?: string;
  level?: string;
  price?: PriceFilter;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  sort: CatalogueSort;
  page: number;
  pageSize: number;
}

/** Paramètres tels que reçus d'Express : chaînes, ou tableaux/objets si l'URL en répète/imbrique. */
export type RawCatalogueQuery = Record<string, unknown>;

/** Une formation publiée, vue minimale nécessaire aux filtres. */
export interface CatalogueEntry {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  category: string | null;
  level: string | null;
  estimatedDurationMinutes: number | null;
  publishedAt: Date | null;
  sourceLocale: string;
  /** Langues des traductions PUBLIÉES (hors langue d'origine). */
  locales: readonly string[];
}

function single(raw: RawCatalogueQuery, name: string): string | undefined {
  const value = raw[name];
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    throw new InvalidCatalogueQueryError(`Paramètre « ${name} » invalide.`);
  }
  return value.trim() || undefined;
}

function boundedText(raw: RawCatalogueQuery, name: string): string | undefined {
  const value = single(raw, name);
  if (value === undefined) return undefined;
  if (value.length > MAX_TEXT_LENGTH) {
    throw new InvalidCatalogueQueryError(`Paramètre « ${name} » trop long (${MAX_TEXT_LENGTH} caractères au plus).`);
  }
  return value;
}

function integer(raw: RawCatalogueQuery, name: string, min: number, max: number): number | undefined {
  const value = single(raw, name);
  if (value === undefined) return undefined;
  if (!/^\d{1,10}$/.test(value)) {
    throw new InvalidCatalogueQueryError(`Paramètre « ${name} » : entier positif attendu.`);
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw new InvalidCatalogueQueryError(`Paramètre « ${name} » hors limites (${min} à ${max}).`);
  }
  return parsed;
}

function oneOf<T extends string>(raw: RawCatalogueQuery, name: string, allowed: readonly T[]): T | undefined {
  const value = single(raw, name);
  if (value === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidCatalogueQueryError(`Paramètre « ${name} » : valeurs acceptées ${allowed.join(", ")}.`);
  }
  return value as T;
}

function parseLanguage(raw: RawCatalogueQuery): string | undefined {
  const language = boundedText(raw, "language");
  if (language !== undefined && !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(language)) {
    throw new InvalidCatalogueQueryError("Paramètre « language » : code de langue attendu (ex. fr, en, pt-BR).");
  }
  return language?.toLowerCase();
}

function parseLevel(raw: RawCatalogueQuery): string | undefined {
  const level = boundedText(raw, "level");
  if (level !== undefined && !/^[A-Za-z0-9_-]{1,40}$/.test(level)) {
    throw new InvalidCatalogueQueryError("Paramètre « level » invalide.");
  }
  return level?.toUpperCase();
}

function parsePriceRange(raw: RawCatalogueQuery): { minPrice?: number; maxPrice?: number } {
  const minPrice = integer(raw, "minPrice", 0, MAX_PRICE);
  const maxPrice = integer(raw, "maxPrice", 0, MAX_PRICE);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new InvalidCatalogueQueryError("Paramètres « minPrice » et « maxPrice » : le minimum dépasse le maximum.");
  }
  return { minPrice, maxPrice };
}

/** Valide les paramètres bruts. `pageSize` supérieur au maximum est ramené au maximum ; tout le reste hors règle donne 400. */
export function parseCatalogueQuery(raw: RawCatalogueQuery): CatalogueQuery {
  const requestedPageSize = integer(raw, "pageSize", 1, Number.MAX_SAFE_INTEGER);
  return {
    category: boundedText(raw, "category"),
    language: parseLanguage(raw),
    level: parseLevel(raw),
    price: oneOf(raw, "price", PRICE_FILTERS),
    ...parsePriceRange(raw),
    q: boundedText(raw, "q"),
    sort: oneOf(raw, "sort", CATALOGUE_SORTS) ?? "recent",
    page: integer(raw, "page", 1, MAX_PAGE) ?? 1,
    pageSize: Math.min(requestedPageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

/** Minuscules sans accents, pour une recherche insensible à la casse et aux diacritiques. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function matchesText(entry: CatalogueEntry, needle: string): boolean {
  const haystack = normalizeSearchText(
    [entry.title, entry.subtitle, entry.description, entry.category].filter(Boolean).join(" "),
  );
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

/** Langues proposées par une formation : langue d'origine + traductions publiées. */
export function entryLanguages(entry: Pick<CatalogueEntry, "sourceLocale" | "locales">): string[] {
  return [...new Set([entry.sourceLocale, ...entry.locales].map((code) => code.toLowerCase()))];
}

function matchesAttributes(entry: CatalogueEntry, query: CatalogueQuery): boolean {
  if (query.category && entry.category?.toLowerCase() !== query.category.toLowerCase()) return false;
  if (query.level && entry.level?.toUpperCase() !== query.level) return false;
  return !query.language || entryLanguages(entry).includes(query.language);
}

function matchesPrice(entry: CatalogueEntry, query: CatalogueQuery): boolean {
  if (query.price === "free" && entry.price !== 0) return false;
  if (query.price === "paid" && entry.price <= 0) return false;
  if (query.minPrice !== undefined && entry.price < query.minPrice) return false;
  return query.maxPrice === undefined || entry.price <= query.maxPrice;
}

export function filterCatalogue<T extends CatalogueEntry>(entries: readonly T[], query: CatalogueQuery): T[] {
  const needle = query.q ? normalizeSearchText(query.q) : undefined;
  return entries.filter(
    (entry) => matchesAttributes(entry, query) && matchesPrice(entry, query) && (!needle || matchesText(entry, needle)),
  );
}

const byTitle = (a: CatalogueEntry, b: CatalogueEntry) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
const time = (entry: CatalogueEntry) => entry.publishedAt?.getTime() ?? 0;

/** Tri stable ; les durées inconnues passent toujours en dernier, quel que soit le sens. */
export function sortCatalogue<T extends CatalogueEntry>(entries: readonly T[], sort: CatalogueSort): T[] {
  const withDuration = (direction: 1 | -1) => (a: T, b: T) => {
    const left = a.estimatedDurationMinutes;
    const right = b.estimatedDurationMinutes;
    if (left === null && right === null) return byTitle(a, b);
    if (left === null) return 1;
    if (right === null) return -1;
    return (left - right) * direction || byTitle(a, b);
  };
  const comparators: Record<CatalogueSort, (a: T, b: T) => number> = {
    recent: (a, b) => time(b) - time(a) || byTitle(a, b),
    price_asc: (a, b) => a.price - b.price || byTitle(a, b),
    price_desc: (a, b) => b.price - a.price || byTitle(a, b),
    title: byTitle,
    duration_asc: withDuration(1),
    duration_desc: withDuration(-1),
  };
  return [...entries].sort(comparators[sort]);
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(entries: readonly T[], page: number, pageSize: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const start = (page - 1) * pageSize;
  return { items: entries.slice(start, start + pageSize), total: entries.length, page, pageSize, totalPages };
}

export interface Facet {
  value: string;
  count: number;
}

export interface CatalogueFacets {
  categories: Facet[];
  languages: Facet[];
  levels: Facet[];
}

function countBy(values: readonly (string | null)[]): Facet[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
}

/** Valeurs proposées aux filtres, calculées sur TOUT le catalogue publié (pas sur le résultat filtré). */
export function buildFacets(entries: readonly CatalogueEntry[]): CatalogueFacets {
  return {
    categories: countBy(entries.map((entry) => entry.category)),
    languages: countBy(entries.flatMap((entry) => entryLanguages(entry))),
    levels: countBy(entries.map((entry) => entry.level?.toUpperCase() ?? null)),
  };
}
