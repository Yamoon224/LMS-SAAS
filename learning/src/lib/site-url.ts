/**
 * URL publique du site (sitemap, robots, Open Graph, hreflang). Fonction pure : l'origine vient du host de la
 * requête (jamais d'un domaine codé en dur), avec les mêmes garde-fous que la résolution du tenant.
 */

const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;

function firstValue(header: string | null | undefined): string | undefined {
  return header?.split(",")[0]?.trim() || undefined;
}

export interface OriginInput {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  /** `process.env.NODE_ENV === "production"` : en production, le protocole par défaut est https. */
  production: boolean;
}

/** Origine (`https://ecole.exemple.com`) ou `null` si le host est absent ou malformé. */
export function resolveOrigin(input: OriginInput): string | null {
  const host = firstValue(input.forwardedHost) ?? firstValue(input.host);
  if (!host || !HOST_PATTERN.test(host)) return null;

  const hostname = host.split(":")[0] ?? "";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
  const proto = firstValue(input.forwardedProto)?.toLowerCase();
  if (proto === "http" || proto === "https") return `${proto}://${host}`;
  return `${input.production && !isLocal ? "https" : "http"}://${host}`;
}

/** Concatène origine et chemin absolu (`/courses/x`) sans doubler de slash. */
export function absoluteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
