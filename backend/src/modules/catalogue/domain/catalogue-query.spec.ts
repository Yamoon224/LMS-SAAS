import {
  buildFacets,
  filterCatalogue,
  InvalidCatalogueQueryError,
  MAX_PAGE_SIZE,
  paginate,
  parseCatalogueQuery,
  sortCatalogue,
} from "./catalogue-query";
import type { CatalogueEntry } from "./catalogue-query";

const entry = (overrides: Partial<CatalogueEntry> & { id: string }): CatalogueEntry => ({
  title: overrides.id,
  subtitle: null,
  description: null,
  price: 0,
  category: null,
  level: null,
  estimatedDurationMinutes: null,
  publishedAt: new Date("2026-01-01"),
  sourceLocale: "fr",
  locales: [],
  ...overrides,
});

const catalogue: CatalogueEntry[] = [
  entry({ id: "a", title: "Éthique du numérique", price: 0, category: "Tech", level: "BEGINNER", estimatedDurationMinutes: 60, publishedAt: new Date("2026-03-01") }),
  entry({ id: "b", title: "Bases de Python", price: 15000, category: "Tech", level: "BEGINNER", estimatedDurationMinutes: 600, locales: ["en"], publishedAt: new Date("2026-02-01") }),
  entry({ id: "c", title: "Cuisine ivoirienne", price: 8000, category: "Cuisine", level: "ADVANCED", estimatedDurationMinutes: null, sourceLocale: "en", publishedAt: new Date("2026-04-01") }),
  entry({ id: "d", title: "Droit des affaires", subtitle: "Contrats", price: 30000, category: "Droit", level: "INTERMEDIATE", estimatedDurationMinutes: 120, publishedAt: null }),
];

const ids = (list: readonly CatalogueEntry[]) => list.map((e) => e.id);
const run = (raw: Record<string, unknown>) => {
  const query = parseCatalogueQuery(raw);
  return paginate(sortCatalogue(filterCatalogue(catalogue, query), query.sort), query.page, query.pageSize);
};

describe("parseCatalogueQuery", () => {
  it("applique les valeurs par défaut", () => {
    expect(parseCatalogueQuery({})).toEqual({
      category: undefined,
      language: undefined,
      level: undefined,
      price: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      q: undefined,
      sort: "recent",
      page: 1,
      pageSize: 12,
    });
  });

  it("normalise langue et niveau et ignore les paramètres inconnus", () => {
    const query = parseCatalogueQuery({ language: "FR", level: "beginner", inconnu: "x", price: "paid", sort: "title" });
    expect(query).toMatchObject({ language: "fr", level: "BEGINNER", price: "paid", sort: "title" });
  });

  it.each([
    [{ sort: "created_at; DROP TABLE" }],
    [{ sort: "price" }],
    [{ price: "cheap" }],
    [{ language: "fr;x" }],
    [{ language: "francais" }],
    [{ level: "<script>" }],
    [{ page: "0" }],
    [{ page: "-1" }],
    [{ page: "abc" }],
    [{ page: "99999" }],
    [{ pageSize: "0" }],
    [{ pageSize: "-5" }],
    [{ pageSize: "1e3" }],
    [{ minPrice: "-1" }],
    [{ minPrice: "10", maxPrice: "5" }],
    [{ q: "x".repeat(101) }],
    [{ category: ["a", "b"] }],
    [{ sort: ["title", "recent"] }],
    [{ q: { $ne: "" } }],
  ])("refuse les paramètres hors liste blanche ou malformés : %j", (raw) => {
    expect(() => parseCatalogueQuery(raw)).toThrow(InvalidCatalogueQueryError);
  });

  it("borne un pageSize géant au maximum", () => {
    expect(parseCatalogueQuery({ pageSize: "100000" }).pageSize).toBe(MAX_PAGE_SIZE);
    expect(parseCatalogueQuery({ pageSize: "9999999999" }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it("traite une chaîne vide comme absente", () => {
    expect(parseCatalogueQuery({ sort: "", q: "  ", page: "" }).sort).toBe("recent");
  });
});

describe("filterCatalogue", () => {
  it("filtre par catégorie (insensible à la casse), niveau et langue (origine ou traduction publiée)", () => {
    expect(ids(run({ category: "tech" }).items)).toEqual(["a", "b"]);
    expect(ids(run({ level: "advanced" }).items)).toEqual(["c"]);
    expect(ids(run({ language: "en" }).items).sort()).toEqual(["b", "c"]);
    expect(ids(run({ language: "de" }).items)).toEqual([]);
  });

  it("filtre gratuit / payant et fourchette de prix", () => {
    expect(ids(run({ price: "free" }).items)).toEqual(["a"]);
    expect(ids(run({ price: "paid" }).items).sort()).toEqual(["b", "c", "d"]);
    expect(ids(run({ minPrice: "8000", maxPrice: "15000" }).items).sort()).toEqual(["b", "c"]);
  });

  it("recherche sans tenir compte des accents ni de la casse, sur tous les mots", () => {
    expect(ids(run({ q: "ethique" }).items)).toEqual(["a"]);
    expect(ids(run({ q: "CONTRATS droit" }).items)).toEqual(["d"]);
    expect(ids(run({ q: "python cuisine" }).items)).toEqual([]);
  });

  it("combine les filtres", () => {
    expect(ids(run({ category: "Tech", price: "paid", language: "en" }).items)).toEqual(["b"]);
  });
});

describe("sortCatalogue", () => {
  it("trie par récence (les non datées en dernier), titre, prix et durée", () => {
    expect(ids(run({ sort: "recent" }).items)).toEqual(["c", "a", "b", "d"]);
    expect(ids(run({ sort: "title" }).items)).toEqual(["b", "c", "d", "a"]);
    expect(ids(run({ sort: "price_asc" }).items)).toEqual(["a", "c", "b", "d"]);
    expect(ids(run({ sort: "price_desc" }).items)).toEqual(["d", "b", "c", "a"]);
  });

  it("place les durées inconnues en dernier dans les deux sens", () => {
    expect(ids(run({ sort: "duration_asc" }).items)).toEqual(["a", "d", "b", "c"]);
    expect(ids(run({ sort: "duration_desc" }).items)).toEqual(["b", "d", "a", "c"]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const before = ids(catalogue);
    sortCatalogue(catalogue, "price_desc");
    expect(ids(catalogue)).toEqual(before);
  });
});

describe("paginate", () => {
  it("découpe en pages et renvoie un total cohérent", () => {
    const page = run({ pageSize: "3", page: "2", sort: "title" });
    expect(page).toMatchObject({ total: 4, page: 2, pageSize: 3, totalPages: 2 });
    expect(ids(page.items)).toEqual(["a"]);
  });

  it("renvoie une page vide au-delà de la dernière, sans erreur", () => {
    const page = run({ page: "50" });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(4);
  });

  it("garde au moins une page pour un catalogue vide", () => {
    expect(paginate([], 1, 12).totalPages).toBe(1);
  });
});

describe("buildFacets", () => {
  it("compte catégories, langues et niveaux sur tout le catalogue", () => {
    const facets = buildFacets(catalogue);
    expect(facets.categories).toEqual([
      { value: "Cuisine", count: 1 },
      { value: "Droit", count: 1 },
      { value: "Tech", count: 2 },
    ]);
    expect(facets.languages).toEqual([
      { value: "en", count: 2 },
      { value: "fr", count: 3 },
    ]);
    expect(facets.levels.map((f) => f.value)).toEqual(["ADVANCED", "BEGINNER", "INTERMEDIATE"]);
  });
});
