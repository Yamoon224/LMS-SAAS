/** PUB-03 / SEO : données structurées JSON-LD `Course` et liens `hreflang`. Fonctions pures. */

export interface JsonLdCourseInput {
  name: string;
  description?: string | null;
  url: string;
  imageUrl?: string | null;
  providerName: string;
  price: number;
  currency: string;
  language?: string | null;
  instructors?: string[];
}

export function courseJsonLd(input: JsonLdCourseInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    ...(input.description ? { description: input.description.slice(0, 5000) } : {}),
    url: input.url,
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
    ...(input.language ? { inLanguage: input.language } : {}),
    provider: { "@type": "Organization", name: input.providerName },
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.currency,
      availability: "https://schema.org/InStock",
      url: input.url,
    },
    ...(input.instructors?.length
      ? { instructor: input.instructors.map((name) => ({ "@type": "Person", name })) }
      : {}),
  };
}

/** JSON sûr à injecter dans une balise <script> : `<`, `>` et `&` échappés (aucune sortie de balise possible). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Alternatives de langue (`?lang=`) : seulement s'il existe au moins deux langues. `x-default` pointe vers l'URL
 * sans paramètre. Les chemins sont relatifs : Next les résout avec `metadataBase` (origine de la requête).
 */
export function alternateLanguages(path: string, languages: readonly string[]): Record<string, string> | undefined {
  const unique = [...new Set(languages.map((code) => code.toLowerCase()))];
  if (unique.length < 2) return undefined;
  return {
    "x-default": path,
    ...Object.fromEntries(unique.map((code) => [code, `${path}?lang=${encodeURIComponent(code)}`])),
  };
}
