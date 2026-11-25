import { NextResponse } from "next/server";

import { decodeSessionClaims, getAccessToken } from "@/lib/session";

/**
 * Renvoie {userId, roles, permissions} décodés du jeton d'accès (cookie httpOnly) côté serveur, sans jamais
 * exposer le jeton lui-même. Sert uniquement à adapter l'interface (masquer les entrées non autorisées) :
 * le backend reste l'autorité (403) sur chaque appel.
 */
export async function GET(): Promise<NextResponse> {
  const token = await getAccessToken();
  const claims = token ? decodeSessionClaims(token) : null;

  if (!claims) {
    return NextResponse.json({ message: "Non authentifié." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(claims, { headers: { "Cache-Control": "no-store" } });
}
