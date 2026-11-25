import { describe, expect, it } from "vitest";

import {
  catalogueHref,
  filtersToApiQuery,
  hasActiveFilters,
  parseCatalogueFilters,
} from "./catalogue-filters";

describe("parseCatalogueFilters", () => {
  it("applique les valeurs par défaut", () => {
    const { filters, invalid } = parseCatalogueFilters({});
    expect(filters).toMatchObject({ sort: "recent", page: 1 });
    expect(invalid).toBe(false);
    expect(hasActiveFilters(filters)).toBe(false);
  });

  it("lit tous les filtres valides", () => {
    const { filters, invalid } = parseCatalogueFilters({
      q: " python ",
      category: "Tech",
      language: "EN",
      level: "beginner",
      price: "paid",
      minPrice: "1000",
      maxPrice: "5000",
      sort: "price_asc",
      page: "3",
    });
    expect(invalid).toBe(false);
    expect(filters).toEqual({
      q: "python",
      category: "Tech",
      language: "en",
      level: "BEGINNER",
      price: "paid",
      minPrice: 1000,
      maxPrice: 5000,
      sort: "price_asc",
      page: 3,
    });
  });

  it.each([
    [{ sort: "created_at" }],
    [{ price: "cheap" }],
    [{ language: "klingon!" }],
    [{ level: "<b>" }],
    [{ page: "0" }],
    [{ page: "abc" }],
    [{ minPrice: "-5" }],
    [{ category: ["a", "b"] }],
    [{ q: "x".repeat(101) }],
    [{ minPrice: "10", maxPrice: "5" }],
  ])("écarte une valeur hors liste blanche et le signale : %j", (params) => {
    const { filters, invalid } = parseCatalogueFilters(params);
    expect(invalid).toBe(true);
    expect(filters.sort).toBe("recent");
    expect(filters.page).toBe(1);
  });

  it("n'envoie jamais une valeur invalide au backend", () => {
    const { filters } = parseCatalogueFilters({ sort: "evil; drop", price: "x", page: "-1", q: "ok" });
    expect(filtersToApiQuery(filters)).toBe("q=ok&pageSize=12");
  });
});

describe("catalogueHref", () => {
  const { filters } = parseCatalogueFilters({ category: "Tech", sort: "title", page: "4" });

  it("omet les valeurs par défaut", () => {
    expect(catalogueHref(parseCatalogueFilters({}).filters)).toBe("/courses");
  });

  it("revient à la page 1 quand un filtre change, pas quand seule la page change", () => {
    expect(catalogueHref(filters, { price: "free" })).toBe("/courses?category=Tech&price=free&sort=title");
    expect(catalogueHref(filters, { page: 5 })).toBe("/courses?category=Tech&sort=title&page=5");
  });

  it("encode les valeurs", () => {
    expect(catalogueHref(parseCatalogueFilters({}).filters, { q: "a&b=c d" })).toBe("/courses?q=a%26b%3Dc+d");
  });

  it("permet de retirer un filtre", () => {
    expect(catalogueHref(filters, { category: undefined })).toBe("/courses?sort=title");
  });
});
