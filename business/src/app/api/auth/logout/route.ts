import { headers } from "next/headers";
import { NextResponse } from "next/server";


import { clearSessionCookies, getRefreshToken } from "@/lib/session";
import { buildBackendHostHeader, TENANT_SLUG_HEADER } from "@/lib/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

async function logoutHeaders(): Promise<Record<string, string>> {
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
 * Déconnexion : révoque le jeton de rafraîchissement côté backend (POST
 * /auth/logout, voir TokenService.revoke) avant de supprimer les cookies de
 * session, pour qu'un cookie refresh volé ne reste pas valable jusqu'à son
 * expiration naturelle (section 11 "Sécurité"). La révocation est best-effort
 * : un échec (API injoignable, jeton déjà expiré) ne doit jamais empêcher la
 * déconnexion côté client. Route non tenant-scopée : /auth/logout ne dépend
 * pas du `Host`, seul le refresh token fourni compte.
 */
export async function POST(): Promise<NextResponse> {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: await logoutHeaders(),
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    } catch {
      // Best-effort : l'API backend peut être injoignable, on continue la déconnexion locale.
    }
  }

  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
