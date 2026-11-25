import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { parseLangParam, withCookie } from "@/lib/lang-param";

/** Doit rester synchronisé avec backend/src/shared/constants/reserved-slugs.ts. */
const BACKOFFICE_SUFFIX = "-backoffice";
const TENANT_SLUG_HEADER = "x-tenant-slug";
const ACCESS_TOKEN_COOKIE = "learning_access_token";
const REFRESH_TOKEN_COOKIE = "learning_refresh_token";

/** Routes réservées aux apprenants connectés (catalogue, fiches et /verify restent publics). */
const PROTECTED_PREFIXES = ["/my-learning", "/certificates", "/notifications", "/purchases", "/profile"];

/** Slug du tenant depuis `{slug}.{baseDomain}` ; undefined pour admin.*, api.*, *-backoffice.*. */
function resolveTenantSlug(request: NextRequest): string | undefined {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostname = host.split(":")[0] ?? "";
  const baseDomain = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ?? "";

  if (baseDomain && hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.slice(0, -(baseDomain.length + 1));
    const isOutOfScope =
      !subdomain ||
      subdomain === "admin" ||
      subdomain === "api" ||
      subdomain.endsWith(BACKOFFICE_SUFFIX);
    return isOutOfScope ? undefined : subdomain;
  }

  // Dev uniquement : permet de tester sur http://localhost:<port> sans fichier hosts.
  if (process.env.NODE_ENV !== "production") {
    return process.env.LEARNING_DEV_TENANT_SLUG || undefined;
  }
  return undefined;
}

/**
 * 1. Résolution du tenant (header interne x-tenant-slug, toujours écrasé : un
 *    client ne peut pas l'imposer). Le backend reste la source de vérité
 *    (existence / statut du tenant).
 * 2. Protection des routes apprenant : présence du cookie de session seulement ;
 *    la validité réelle est vérifiée par le backend à chaque appel.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(TENANT_SLUG_HEADER);
  const tenantSlug = resolveTenantSlug(request);
  if (tenantSlug) requestHeaders.set(TENANT_SLUG_HEADER, tenantSlug);

  const hasSession =
    request.cookies.has(ACCESS_TOKEN_COOKIE) || request.cookies.has(REFRESH_TOKEN_COOKIE);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/my-learning", request.url));
  }

  // ?lang=xx : langue adressable par URL (liens hreflang) ; appliquée à cette requête et mémorisée un an.
  const lang = parseLangParam(request.nextUrl.searchParams.get("lang"));
  if (lang) requestHeaders.set("cookie", withCookie(request.headers.get("cookie"), LOCALE_COOKIE, lang));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (lang) response.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
