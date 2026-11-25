/** Pages légales de la plateforme exposées à l'apprenant (ADM-41), avec leur adresse lisible. */
export const LEGAL_PAGES = [
  { slug: "cgu", type: "TERMS_OF_USE" },
  { slug: "cgv", type: "TERMS_OF_SALE" },
  { slug: "confidentialite", type: "PRIVACY_POLICY" },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]["slug"];

export function findLegalPage(slug: string) {
  return LEGAL_PAGES.find((page) => page.slug === slug);
}

/** Adresse lisible de la page d'un type de document (même table que le pied de page). */
export function legalHref(type: string): string {
  const page = LEGAL_PAGES.find((candidate) => candidate.type === type);
  return page ? `/legal/${page.slug}` : "/";
}
