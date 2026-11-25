import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildBackendHostHeader, TENANT_SLUG_HEADER } from "@/lib/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

interface ResetBody {
  token?: string;
  password?: string;
}

/** Proxy de réinitialisation (POST /v1/auth/reset-password, route publique du backend). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ResetBody;
  try {
    body = (await request.json()) as ResetBody;
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }
  if (!body.token || !body.password || body.password.length < 8) {
    return NextResponse.json({ message: "Lien ou mot de passe invalide." }, { status: 400 });
  }

  const tenantSlug = request.headers.get(TENANT_SLUG_HEADER) ?? undefined;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tenantSlug) {
    const backendHost = buildBackendHostHeader(tenantSlug);
    headers.Host = backendHost;
    // undici peut ignorer un `Host` forgé : le backend lit `x-forwarded-host` en priorité.
    headers["X-Forwarded-Host"] = backendHost;
  }

  try {
    const backendResponse = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token: body.token, password: body.password }),
      cache: "no-store",
    });
    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: "Lien invalide ou expiré. Refaites une demande de réinitialisation." },
        { status: backendResponse.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Le serveur est injoignable." }, { status: 502 });
  }
}
