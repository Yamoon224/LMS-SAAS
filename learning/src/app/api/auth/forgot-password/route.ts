import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_URL, TENANT_SLUG_HEADER, tenantHeaders } from "@/lib/tenant";

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

  const slug = request.headers.get(TENANT_SLUG_HEADER) ?? undefined;

  try {
    const backendResponse = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tenantHeaders(slug) },
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
