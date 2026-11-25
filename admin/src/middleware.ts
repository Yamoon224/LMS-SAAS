import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * L'app admin n'a pas de notion de tenant : un seul sous-domaine
 * (admin.votredomaine.com) sert le back-office plateforme. Ce middleware
 * protège donc uniquement les routes contre un accès non authentifié, en
 * vérifiant la seule présence du cookie de session (pas sa validité JWT
 * complète — cette vérification forte reste faite par le backend sur
 * chaque appel API, via le proxy /api/backend).
 */
const PUBLIC_PATHS = ["/login", "/activate", "/forgot-password", "/reset-password"];
const ACCESS_TOKEN_COOKIE = "admin_access_token";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAuthApiRoute = pathname.startsWith("/api/auth/");

  if (isPublicPath || isAuthApiRoute) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE);

  if (!hasSession && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
