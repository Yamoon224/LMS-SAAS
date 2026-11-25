import type { MetadataRoute } from "next";

import { getCatalogue } from "@/features/catalogue/api/catalogue.server";
import { parseCatalogueFilters } from "@/features/catalogue/lib/catalogue-filters";
import { absoluteUrl } from "@/lib/site-url";
import { getSiteOrigin } from "@/lib/site-url.server";

const PAGE_SIZE = 50;
/** Garde-fou : 20 pages de 50 = 1000 formations par plan de site. */
const MAX_PAGES = 20;

/**
 * Plan du site du tenant courant : accueil, catalogue et fiches des formations PUBLIÉES. L'origine vient du host
 * de la requête ; les langues alternatives sont déclarées par `hreflang` sur chaque fiche (`?lang=`).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getSiteOrigin();
  if (!origin) return [];

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl(origin, "/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl(origin, "/courses"), changeFrequency: "daily", priority: 0.9 },
  ];

  const { filters } = parseCatalogueFilters({});
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await getCatalogue({ ...filters, page }, PAGE_SIZE);
    if (!result.ok) break;
    for (const course of result.data.items) {
      const path = `/courses/${encodeURIComponent(course.id)}`;
      const languages = course.languages.length > 1
        ? Object.fromEntries(course.languages.map((code) => [code, absoluteUrl(origin, `${path}?lang=${encodeURIComponent(code)}`)]))
        : undefined;
      entries.push({
        url: absoluteUrl(origin, path),
        lastModified: course.publishedAt ? new Date(course.publishedAt) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
        ...(languages ? { alternates: { languages } } : {}),
      });
    }
    if (page >= result.data.totalPages) break;
  }
  return entries;
}
