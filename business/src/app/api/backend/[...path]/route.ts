import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { trySilentRefresh } from "@/lib/backend-refresh";
import { clearSessionCookies, getAccessToken } from "@/lib/session";
import { buildBackendHostHeader, TENANT_SLUG_HEADER } from "@/lib/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

async function forwardToBackend(
  request: NextRequest,
  path: string[],
  token: string,
  bodyText: string | undefined,
  tenantSlug: string | undefined,
): Promise<Response> {
  const search = request.nextUrl.search;
  const targetUrl = `${API_URL}/${path.join("/")}${search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // BE-01 (TenantGuard): le backend résout le tenant depuis le `Host` HTTP
  // de la requête qu'il reçoit (TenantResolutionMiddleware), jamais depuis
  // un paramètre explicite. Ce proxy tournant côté serveur avec sa propre
  // URL cible (NEXT_PUBLIC_API_URL, ex. "api.votredomaine.local:3001"), on
  // doit lui transmettre explicitement le `Host` attendu
  // ("{slug}-backoffice.{baseDomain}") pour que le bon tenant soit résolu.
  if (tenantSlug) {
    const backendHost = buildBackendHostHeader(tenantSlug);
    headers.Host = backendHost;
    // undici (fetch Node) peut ignorer un `Host` forgé : le backend lit `x-forwarded-host` en priorité.
    headers["X-Forwarded-Host"] = backendHost;
  }

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: bodyText,
    cache: "no-store",
  });
}

/**
 * Proxy Route Handler vers le backend NestJS.
 *
 * Le jeton d'accès vit dans un cookie httpOnly (src/lib/session.ts), donc
 * invisible au JS client — ce proxy est le seul endroit qui le lit et
 * l'attache en `Authorization: Bearer` avant de relayer la requête à l'API.
 * Les composants client (TanStack Query) appellent `/api/backend/...` au
 * lieu de l'API NestJS directement : ils ne voient jamais le jeton.
 *
 * Contrairement au proxy de l'app admin (plateforme, pas de notion de
 * tenant), ce proxy est *tenant-aware* : il transmet au backend le `Host`
 * reconstruit depuis le slug résolu par le middleware (voir lib/tenant.ts),
 * pour que TenantGuard résolve la bonne entreprise (section 3.3, BE-01).
 *
 * Si le backend répond 401 (jeton d'accès expiré), on tente une seule fois
 * un rafraîchissement silencieux via le refresh token (httpOnly, jusque-là
 * inutilisé) avant d'abandonner et de considérer la session expirée.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  // Le cookie d'accès expire (15 min) avant le refresh token (7 j) : sans jeton, on tente un refresh.
  const token = (await getAccessToken()) ?? (await trySilentRefresh());
  const tenantSlug = request.headers.get(TENANT_SLUG_HEADER) ?? undefined;

  if (!token) {
    return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const bodyText = hasBody ? await request.text() : undefined;

  let backendResponse: Response;
  try {
    backendResponse = await forwardToBackend(request, path, token, bodyText, tenantSlug);
  } catch {
    return NextResponse.json(
      { message: "L'API backend est injoignable." },
      { status: 502 },
    );
  }

  if (backendResponse.status === 401) {
    const newAccessToken = await trySilentRefresh();

    if (!newAccessToken) {
      await clearSessionCookies();
      return NextResponse.json({ message: "Session expirée, veuillez vous reconnecter." }, { status: 401 });
    }

    try {
      backendResponse = await forwardToBackend(request, path, newAccessToken, bodyText, tenantSlug);
    } catch {
      return NextResponse.json(
        { message: "L'API backend est injoignable." },
        { status: 502 },
      );
    }
  }

  if (backendResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const contentType = backendResponse.headers.get("content-type") ?? "application/json";

  // Réponses binaires (ex. facture PDF) : relayées telles quelles, jamais décodées en texte.
  if (contentType.startsWith("application/pdf")) {
    const headers: Record<string, string> = { "content-type": contentType };
    const disposition = backendResponse.headers.get("content-disposition");
    if (disposition) headers["content-disposition"] = disposition;
    return new NextResponse(await backendResponse.arrayBuffer(), { status: backendResponse.status, headers });
  }

  const text = await backendResponse.text();
  return new NextResponse(text, {
    status: backendResponse.status,
    headers: { "content-type": contentType },
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
