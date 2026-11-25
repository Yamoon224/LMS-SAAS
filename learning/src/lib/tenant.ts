import "server-only";

import { headers } from "next/headers";

/** Header interne (middleware -> reste de l'app) portant le slug résolu. */
export const TENANT_SLUG_HEADER = "x-tenant-slug";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

export async function getResolvedTenantSlug(): Promise<string | undefined> {
  return (await headers()).get(TENANT_SLUG_HEADER) ?? undefined;
}

/**
 * Host à présenter au backend : il résout le tenant depuis `x-forwarded-host`
 * puis `host`, et la surface "learning" correspond à `{slug}.{APP_BASE_DOMAIN}`
 * (sans suffixe -backoffice).
 */
export function buildBackendHostHeader(tenantSlug: string): string {
  return `${tenantSlug}.${process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ?? ""}`;
}

/**
 * Headers tenant à joindre à tout appel serveur -> backend.
 * Vérifié en live : l'undici de Node IGNORE un en-tête `Host` forgé (le backend
 * recevait `127.0.0.1:port` et répondait TENANT_NON_RESOLU). Seul
 * `X-Forwarded-Host` atteint le backend. En production, le backend doit donc
 * être derrière un reverse proxy qui ÉCRASE X-Forwarded-Host (jamais relayé tel
 * quel depuis Internet), faute de quoi un client pourrait usurper un tenant.
 */
export function tenantHeaders(tenantSlug: string | undefined): Record<string, string> {
  return tenantSlug ? { "X-Forwarded-Host": buildBackendHostHeader(tenantSlug) } : {};
}

/** Nom d'affichage provisoire (repli si /public/tenant est indisponible) : "mon-ecole" -> "Mon Ecole". */
export function tenantDisplayName(slug: string | undefined): string {
  if (!slug) return "Formations";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
