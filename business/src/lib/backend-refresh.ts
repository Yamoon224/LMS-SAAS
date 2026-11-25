import "server-only";

import { headers } from "next/headers";

import { getRefreshToken, setSessionCookies } from "@/lib/session";
import { buildBackendHostHeader, TENANT_SLUG_HEADER } from "@/lib/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

/** En-têtes JSON + Host/X-Forwarded-Host du tenant courant (le refresh n'en dépend pas, mais on reste cohérent). */
async function tenantHeaders(): Promise<Record<string, string>> {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  const slug = (await headers()).get(TENANT_SLUG_HEADER);
  if (slug) {
    const host = buildBackendHostHeader(slug);
    result.Host = host;
    result["X-Forwarded-Host"] = host;
  }
  return result;
}

/**
 * Rafraîchissement silencieux via POST /auth/refresh (TokenService.refresh côté backend).
 * Renvoie le nouveau jeton d'accès, ou `null` (refresh absent, expiré ou révoqué).
 * Le refresh ne dépend pas du tenant : aucun Host particulier requis.
 */
export async function trySilentRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: await tenantHeaders(),
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
