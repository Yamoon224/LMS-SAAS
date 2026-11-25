import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/session";
import { API_URL, TENANT_SLUG_HEADER, tenantHeaders } from "@/lib/tenant";

/** Seules surfaces backend joignables depuis le navigateur apprenant. */
const ALLOWED_PREFIXES = ["public/", "notifications"];

/** Rafraîchissement silencieux (POST /auth/refresh, indépendant du tenant). */
async function trySilentRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) return null;
    await setSessionCookies({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    return null;
  }
}

function forward(
  request: NextRequest,
  path: string[],
  token: string | undefined,
  bodyText: string | undefined,
  slug: string | undefined,
): Promise<Response> {
  return fetch(`${API_URL}/${path.join("/")}${request.nextUrl.search}`, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...tenantHeaders(slug),
    },
    body: bodyText,
    cache: "no-store",
  });
}

const unreachable = () =>
  NextResponse.json({ message: "L'API backend est injoignable." }, { status: 502 });

/**
 * Proxy vers le backend : attache le jeton (cookie httpOnly) et le Host du
 * tenant ({slug}.{baseDomain}). Sur 401, un unique rafraîchissement silencieux
 * est tenté avant de considérer la session expirée.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join("/");
  if (!ALLOWED_PREFIXES.some((prefix) => joined.startsWith(prefix))) {
    return NextResponse.json({ message: "Route non autorisée." }, { status: 404 });
  }

  const slug = request.headers.get(TENANT_SLUG_HEADER) ?? undefined;
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const bodyText = hasBody ? await request.text() : undefined;

  let backendResponse: Response;
  try {
    backendResponse = await forward(request, path, await getAccessToken(), bodyText, slug);
  } catch {
    return unreachable();
  }

  if (backendResponse.status === 401) {
    const newToken = await trySilentRefresh();
    if (!newToken) {
      await clearSessionCookies();
      return NextResponse.json({ message: "Session expirée, veuillez vous reconnecter." }, { status: 401 });
    }
    try {
      backendResponse = await forward(request, path, newToken, bodyText, slug);
    } catch {
      return unreachable();
    }
  }

  if (backendResponse.status === 204) return new NextResponse(null, { status: 204 });

  const headers: Record<string, string> = {
    "content-type": backendResponse.headers.get("content-type") ?? "application/json",
  };
  // Téléchargements (ex. fichier .ics d'une session live) : le nom de fichier fixé par le backend est conservé.
  const disposition = backendResponse.headers.get("content-disposition");
  if (disposition) headers["content-disposition"] = disposition;
  return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers });
}

export { handler as GET, handler as POST, handler as PATCH };
