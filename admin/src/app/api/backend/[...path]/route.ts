import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { adminSurfaceHeaders } from "@/lib/backend-host";
import { clearSessionCookies, getAccessToken, getRefreshToken, setSessionCookies } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

/**
 * Tente un rafraîchissement silencieux via POST /auth/refresh (le backend
 * expose cette route depuis cette itération — voir TokenService.refresh).
 * Renvoie le nouveau jeton d'accès si le rafraîchissement a réussi, sinon
 * `null` (refresh token absent, expiré ou déjà révoqué : l'appelant doit
 * alors traiter la requête comme non authentifiée).
 */
async function trySilentRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminSurfaceHeaders() },
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

async function forwardToBackend(
  request: NextRequest,
  path: string[],
  token: string,
  body: string | ArrayBuffer | undefined,
  contentType: string,
): Promise<Response> {
  const search = request.nextUrl.search;
  const targetUrl = `${API_URL}/${path.join("/")}${search}`;

  return fetch(targetUrl, {
    method: request.method,
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
      ...adminSurfaceHeaders(),
    },
    body,
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
 * Si le backend répond 401 (jeton d'accès expiré), on tente une seule fois
 * un rafraîchissement silencieux via le refresh token (httpOnly, jusque-là
 * inutilisé) avant d'abandonner et de considérer la session expirée.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  // Un téléversement (multipart) est relayé tel quel, avec sa frontière ; tout le reste est du JSON.
  const requestType = request.headers.get("content-type") ?? "";
  const isMultipart = requestType.toLowerCase().startsWith("multipart/form-data");
  const forwardedType = isMultipart ? requestType : "application/json";
  const bodyText = hasBody ? (isMultipart ? await request.arrayBuffer() : await request.text()) : undefined;

  let backendResponse: Response;
  try {
    backendResponse = await forwardToBackend(request, path, token, bodyText, forwardedType);
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
      backendResponse = await forwardToBackend(request, path, newAccessToken, bodyText, forwardedType);
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

  // Réponses binaires (ex. aperçu PDF d'un modèle de certificat) : relayées telles quelles, jamais décodées en texte.
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
