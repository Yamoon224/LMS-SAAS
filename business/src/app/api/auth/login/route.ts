import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { setSessionCookies } from "@/lib/session";
import { buildBackendHostHeader, TENANT_SLUG_HEADER } from "@/lib/tenant";
import { setChallengeCookie } from "@/lib/two-factor-challenge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

interface LoginRequestBody {
  email: string;
  password: string;
}

/**
 * Route Handler proxy pour la connexion (POST /v1/auth/login côté backend).
 * Le mot de passe ne transite jamais côté client après coup : le backend
 * répond avec une paire de jetons que l'on place immédiatement dans des
 * cookies httpOnly (voir src/lib/session.ts), jamais exposés à
 * `document.cookie`.
 *
 * Tenant-aware (contrairement à l'app admin) : le backend associe le jeton
 * émis au tenant résolu depuis le `Host` de CETTE requête (AuthController.login
 * lit `req.tenantId`, posé par TenantGuard à partir du sous-domaine) — on
 * doit donc transmettre le même `Host` reconstruit que le proxy /api/backend
 * (voir lib/tenant.ts), sans quoi la connexion réussirait mais produirait un
 * jeton non scopé à l'entreprise, rejeté par TenantGuard sur l'appel suivant.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { message: "E-mail et mot de passe requis." },
      { status: 400 },
    );
  }

  const tenantSlug = request.headers.get(TENANT_SLUG_HEADER) ?? undefined;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tenantSlug) {
    const backendHost = buildBackendHostHeader(tenantSlug);
    headers.Host = backendHost;
    // undici peut ignorer un `Host` forgé : le backend lit `x-forwarded-host` en priorité.
    headers["X-Forwarded-Host"] = backendHost;
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Le serveur d'authentification est injoignable." },
      { status: 502 },
    );
  }

  if (!backendResponse.ok) {
    const message =
      (backendResponse.status === 400 || backendResponse.status === 401)
        ? "E-mail ou mot de passe incorrect."
        : "Connexion impossible pour le moment.";
    return NextResponse.json({ message }, { status: backendResponse.status });
  }

  const data = (await backendResponse.json()) as {
    accessToken?: string;
    refreshToken?: string;
    twoFactor?: string;
    challengeToken?: string;
  };

  // 2FA : pas de jeton de session à ce stade, seulement un défi (5 min, usage unique) gardé dans un cookie
  // httpOnly. Le navigateur apprend uniquement l'étape suivante (vérifier un code, ou enrôler la 2FA).
  if ((data.twoFactor === "VERIFY" || data.twoFactor === "ENROLL") && typeof data.challengeToken === "string") {
    await setChallengeCookie(data.challengeToken);
    return NextResponse.json({ step: data.twoFactor === "VERIFY" ? "verify" : "enroll" });
  }

  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json(
      { message: "Réponse d'authentification invalide." },
      { status: 502 },
    );
  }

  await setSessionCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return NextResponse.json({ step: "done" });
}
