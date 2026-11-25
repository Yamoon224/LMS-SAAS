import { NextResponse } from "next/server";

import { adminSurfaceHeaders } from "@/lib/backend-host";
import { clearSessionCookies, getRefreshToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

/**
 * Déconnexion : révoque le jeton de rafraîchissement côté backend (POST
 * /auth/logout, voir TokenService.revoke) avant de supprimer les cookies de
 * session, pour qu'un cookie refresh volé ne reste pas valable jusqu'à son
 * expiration naturelle (section 11 "Sécurité"). La révocation est best-effort
 * : un échec (API injoignable, jeton déjà expiré) ne doit jamais empêcher la
 * déconnexion côté client.
 */
export async function POST(): Promise<NextResponse> {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminSurfaceHeaders() },
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
