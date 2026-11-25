import { NextResponse } from "next/server";

import { trySilentRefresh } from "@/lib/backend-refresh";
import { decodeJwtClaims } from "@/lib/jwt";
import { getAccessToken } from "@/lib/session";

/**
 * Session courante pour l'UI : { userId, roles, permissions } décodés du JWT httpOnly, sans
 * jamais exposer le jeton brut. Information de confort (masquage de navigation) — le backend
 * reste l'autorité sur chaque appel.
 */
export async function GET(): Promise<NextResponse> {
  let token = await getAccessToken();
  let claims = token ? decodeJwtClaims(token) : null;

  const expired = claims?.exp !== undefined && claims.exp * 1000 <= Date.now() + 5_000;
  if (!claims || expired) {
    token = (await trySilentRefresh()) ?? undefined;
    claims = token ? decodeJwtClaims(token) : null;
  }

  if (!claims?.sub) {
    return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json(
    { userId: claims.sub, roles: claims.roles ?? [], permissions: claims.permissions ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
