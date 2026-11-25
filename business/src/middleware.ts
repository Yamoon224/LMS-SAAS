import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Suffixe des sous-domaines back-office entreprise, ex. "acme-backoffice".
 * Doit rester synchronisé avec BACKOFFICE_SUFFIX côté backend
 * (backend/src/shared/constants/reserved-slugs.ts).
 */
const BACKOFFICE_SUFFIX = "-backoffice";

/** Header interne utilisé pour transmettre le slug résolu au reste de l'app. */
const TENANT_SLUG_HEADER = "x-tenant-slug";

const ACCESS_TOKEN_COOKIE = "business_access_token";
const REFRESH_TOKEN_COOKIE = "business_refresh_token";
const PUBLIC_PATHS = ["/login", "/activate", "/forgot-password", "/reset-password"];

/**
 * Middleware unique de l'app business, qui combine deux responsabilités
 * (contrairement à l'app admin, qui n'a besoin que de la seconde) :
 *
 * 1. Résolution du tenant (entreprise cliente) à partir du sous-domaine de
 *    la requête entrante, sur le modèle `{slug}-backoffice.{baseDomain}`.
 *    Exemple : pour `acme-backoffice.votredomaine.local`, le slug résolu est
 *    "acme". Le slug est injecté dans un header interne (`x-tenant-slug`)
 *    afin que les Server Components / Route Handlers en aval (notamment le
 *    proxy /api/backend, voir lib/tenant.ts) puissent reconstruire le `Host`
 *    attendu par le backend sans avoir à reparser le Host eux-mêmes.
 *
 *    Ce middleware ne vérifie PAS que le tenant existe réellement : cette
 *    vérification (et le rejet éventuel) est du ressort de l'API backend
 *    (TenantGuard), qui reste la source de vérité.
 *
 * 2. Protection des routes contre un accès non authentifié, en vérifiant la
 *    seule présence du cookie de session (pas sa validité JWT complète —
 *    cette vérification forte reste faite par le backend sur chaque appel
 *    API, via le proxy /api/backend).
 *
 * En développement local, sans sous-domaine réel disponible, voir le README
 * pour la configuration du fichier hosts nécessaire (ex. faire pointer
 * `acme-backoffice.votredomaine.local` vers 127.0.0.1) : le backend résout
 * le tenant uniquement depuis le `Host` HTTP, il n'existe pas de secours par
 * paramètre de requête ou en-tête côté backend.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAuthApiRoute = pathname.startsWith("/api/auth/");

  // --- 1. Résolution du tenant depuis le sous-domaine ---
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostname = host.split(":")[0] ?? "";
  const baseDomain = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ?? "";

  let tenantSlug: string | undefined;
  if (baseDomain && hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.slice(0, -(baseDomain.length + 1));
    if (subdomain.endsWith(BACKOFFICE_SUFFIX)) {
      const slug = subdomain.slice(0, -BACKOFFICE_SUFFIX.length);
      if (slug) tenantSlug = slug;
    }
  }

  const requestHeaders = new Headers(request.headers);
  // Jamais de confiance dans un en-tête interne fourni par le client.
  requestHeaders.delete(TENANT_SLUG_HEADER);
  if (tenantSlug) {
    requestHeaders.set(TENANT_SLUG_HEADER, tenantSlug);
  }

  // --- 2. Protection des routes ---
  if (isPublicPath || isAuthApiRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Le cookie d'accès (15 min) expire avant le refresh token (7 j) : le proxy rafraîchit en silence.
  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE) || request.cookies.has(REFRESH_TOKEN_COOKIE);

  if (!hasSession && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
