import "server-only";

import { NextResponse } from "next/server";

import { adminSurfaceHeaders } from "@/lib/backend-host";
import { clearChallengeCookie, getChallengeToken } from "@/lib/two-factor-challenge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

/** Codes d'erreur backend qui signifient que le défi n'est plus utilisable : il faut ressaisir le mot de passe. */
const CHALLENGE_LOST_CODES = new Set(["DEFI_2FA_INVALIDE", "COMPTE_INACTIF"]);

export type BackendCallResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse };

/**
 * Appelle une route 2FA publique du backend avec le défi lu dans le cookie httpOnly. En cas d'erreur, relaie le
 * message métier et le `code` (le client en a besoin pour distinguer « code faux » de « défi expiré ») ; un défi
 * perdu supprime le cookie pour ne pas laisser un jeton mort.
 */
export async function callChallengeEndpoint(
  path: string,
  extraBody: Record<string, unknown> = {},
): Promise<BackendCallResult> {
  const challengeToken = await getChallengeToken();
  if (!challengeToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Session de vérification expirée : reconnectez-vous.", code: "DEFI_2FA_INVALIDE" },
        { status: 401 },
      ),
    };
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminSurfaceHeaders() },
      body: JSON.stringify({ challengeToken, ...extraBody }),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ message: "Le serveur d'authentification est injoignable." }, { status: 502 }),
    };
  }

  const payload = (await backendResponse.json().catch(() => ({}))) as Record<string, unknown>;

  if (!backendResponse.ok) {
    const code = typeof payload.code === "string" ? payload.code : undefined;
    if (code && CHALLENGE_LOST_CODES.has(code)) await clearChallengeCookie();
    const message = typeof payload.message === "string" ? payload.message : "Vérification impossible pour le moment.";
    return { ok: false, response: NextResponse.json({ message, code }, { status: backendResponse.status }) };
  }

  return { ok: true, data: payload };
}
