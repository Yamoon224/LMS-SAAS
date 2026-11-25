import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { setSessionCookies } from "@/lib/session";
import { API_URL, TENANT_SLUG_HEADER, tenantHeaders } from "@/lib/tenant";

interface LoginBody {
  email?: string;
  password?: string;
}

/**
 * Proxy de connexion (POST /v1/auth/login). Tenant-aware : le backend associe
 * le jeton au tenant résolu depuis le Host ({slug}.{baseDomain}), reconstruit
 * ici à partir du slug posé par le middleware. Les jetons vont directement
 * dans des cookies httpOnly.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ message: "E-mail et mot de passe requis." }, { status: 400 });
  }

  const slug = request.headers.get(TENANT_SLUG_HEADER) ?? undefined;
  if (!slug) {
    return NextResponse.json(
      { message: "Organisation introuvable : ouvrez la plateforme depuis l'adresse de votre organisme." },
      { status: 404 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tenantHeaders(slug) },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Le serveur d'authentification est injoignable." }, { status: 502 });
  }

  if (!backendResponse.ok) {
    const message =
      (backendResponse.status === 400 || backendResponse.status === 401)
        ? "Adresse e-mail ou mot de passe incorrect."
        : backendResponse.status === 403
          ? "Ce compte n'est pas encore actif. Utilisez le lien d'activation reçu par e-mail."
          : "Connexion impossible pour le moment.";
    return NextResponse.json({ message }, { status: backendResponse.status });
  }

  const data = (await backendResponse.json()) as { accessToken?: string; refreshToken?: string };
  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json({ message: "Réponse d'authentification invalide." }, { status: 502 });
  }

  await setSessionCookies({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return NextResponse.json({ ok: true });
}
