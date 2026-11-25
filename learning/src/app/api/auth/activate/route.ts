import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_URL, TENANT_SLUG_HEADER, tenantHeaders } from "@/lib/tenant";

interface ActivateBody {
  token?: string;
  password?: string;
}

/** Proxy d'activation de compte (POST /v1/auth/activate, route publique du backend). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ActivateBody;
  try {
    body = (await request.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }
  if (!body.token || !body.password || body.password.length < 8) {
    return NextResponse.json({ message: "Lien ou mot de passe invalide." }, { status: 400 });
  }

  const slug = request.headers.get(TENANT_SLUG_HEADER) ?? undefined;

  try {
    const backendResponse = await fetch(`${API_URL}/auth/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tenantHeaders(slug) },
      body: JSON.stringify({ token: body.token, password: body.password }),
      cache: "no-store",
    });
    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: "Lien d'activation invalide ou expiré. Demandez un nouvel envoi à votre organisme." },
        { status: backendResponse.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Le serveur est injoignable." }, { status: 502 });
  }
}
