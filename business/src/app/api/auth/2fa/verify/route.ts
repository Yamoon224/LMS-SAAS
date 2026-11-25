import { NextResponse } from "next/server";

import { setSessionCookies } from "@/lib/session";
import { clearChallengeCookie } from "@/lib/two-factor-challenge";
import { callChallengeEndpoint } from "@/lib/two-factor-proxy";

/**
 * Seconde étape de la connexion : le code (TOTP ou de récupération) est envoyé avec le défi gardé dans le cookie
 * httpOnly. Les cookies de session ne sont posés qu'APRÈS cette vérification complète.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (!body || typeof body.code !== "string" || body.code.trim() === "") {
    return NextResponse.json({ message: "Code requis." }, { status: 400 });
  }

  const result = await callChallengeEndpoint("/auth/2fa/verify", { code: body.code });
  if (!result.ok) return result.response;

  const { accessToken, refreshToken } = result.data;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    return NextResponse.json({ message: "Réponse d'authentification invalide." }, { status: 502 });
  }

  await setSessionCookies({ accessToken, refreshToken });
  await clearChallengeCookie();
  return NextResponse.json({ ok: true });
}
