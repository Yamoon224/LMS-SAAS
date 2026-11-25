import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildBackendHostHeader, TENANT_SLUG_HEADER } from "@/lib/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

/**
 * Proxy « mot de passe oublié » (POST /v1/auth/forgot-password, route publique du backend). La réponse est
 * toujours la même, que le compte existe ou non : on ne relaie jamais le détail du backend.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let email: unknown;
  try {
    email = ((await request.json()) as { email?: unknown }).email;
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }
  if (typeof email !== "string" || email.length === 0 || email.length > 254) {
    return NextResponse.json({ message: "Adresse e-mail invalide." }, { status: 400 });
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
    const backendResponse = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    if (backendResponse.status === 429) {
      return NextResponse.json({ message: "Trop de tentatives. Patientez une minute." }, { status: 429 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Le serveur est injoignable." }, { status: 502 });
  }
}
