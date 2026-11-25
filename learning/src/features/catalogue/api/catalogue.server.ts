import "server-only";

import { filtersToApiQuery } from "../lib/catalogue-filters";
import type { CatalogueFilters } from "../lib/catalogue-filters";
import { cataloguePageSchema, courseDetailSchema } from "../schemas/course.schema";

import { serverGet } from "@/lib/server-api";

/** Catalogue public filtré, trié et paginé côté backend, rendu côté serveur (SEO / premier affichage rapide). */
export function getCatalogue(filters: CatalogueFilters, pageSize?: number) {
  return serverGet(`/public/courses?${filtersToApiQuery(filters, pageSize)}`, cataloguePageSchema);
}

export function getCourse(id: string) {
  return serverGet(`/public/courses/${encodeURIComponent(id)}`, courseDetailSchema);
}
