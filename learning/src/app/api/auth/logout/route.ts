import { NextResponse } from "next/server";

import { clearSessionCookies, getRefreshToken } from "@/lib/session";
import { API_URL } from "@/lib/tenant";

/**
 * Déconnexion : révoque le refresh token côté backend (best-effort, un échec ne
 * doit jamais empêcher la déconnexion locale) puis supprime les cookies.
 */
export async function POST(): Promise<NextResponse> {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    } catch {
      // API injoignable : on continue la déconnexion locale.
    }
  }

  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
