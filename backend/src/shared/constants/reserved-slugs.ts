/**
 * Slugs interdits pour un tenant (section 3.2). Empêche qu'une entreprise
 * ne revendique un sous-domaine technique ou un suffixe ambigu.
 */
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "www",
  "mail",
  "app",
  "static",
  "cdn",
  "backoffice",
  "assets",
  "docs",
  "status",
  "support",
] as const;

export const BACKOFFICE_SUFFIX = "-backoffice";

export function isReservedSlug(slug: string): boolean {
  return (
    (RESERVED_SLUGS as readonly string[]).includes(slug) ||
    slug.endsWith(BACKOFFICE_SUFFIX)
  );
}

/** minuscules, chiffres, tirets (section 3.2). */
export const SLUG_FORMAT_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
