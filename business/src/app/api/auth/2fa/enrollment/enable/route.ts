import { NextResponse } from "next/server";

import { setSessionCookies } from "@/lib/session";
import { clearChallengeCookie } from "@/lib/two-factor-challenge";
import { callChallengeEndpoint } from "@/lib/two-factor-proxy";

/**
 * Enrôlement obligatoire (2/2) : confirme avec un premier code. La session est ouverte ici (cookies httpOnly) ;
 * seuls les codes de récupération sont renvoyés au navigateur, pour affichage unique.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (!body || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ message: "Saisissez le code à 6 chiffres." }, { status: 400 });
  }

  const result = await callChallengeEndpoint("/auth/2fa/enrollment/enable", { code: body.code });
  if (!result.ok) return result.response;

  const { accessToken, refreshToken, recoveryCodes } = result.data;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string" || !Array.isArray(recoveryCodes)) {
    return NextResponse.json({ message: "Réponse d'authentification invalide." }, { status: 502 });
  }

  await setSessionCookies({ accessToken, refreshToken });
  await clearChallengeCookie();
  return NextResponse.json({ recoveryCodes });
}
