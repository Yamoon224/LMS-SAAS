import { NextResponse } from "next/server";

import { adminSurfaceHeaders } from "@/lib/backend-host";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

interface ActivateBody {
  token?: string;
  password?: string;
}

/** Proxy d'activation de compte (POST /v1/auth/activate, route publique du backend). */
export async function POST(request: Request): Promise<NextResponse> {
  let body: ActivateBody;
  try {
    body = (await request.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }
  if (!body.token || !body.password || body.password.length < 8) {
    return NextResponse.json({ message: "Lien ou mot de passe invalide." }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json", ...adminSurfaceHeaders() };

  try {
    const backendResponse = await fetch(`${API_URL}/auth/activate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token: body.token, password: body.password }),
      cache: "no-store",
    });
    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: "Lien d'activation invalide ou expiré. Demandez un nouvel envoi à votre administrateur." },
        { status: backendResponse.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Le serveur est injoignable." }, { status: 502 });
  }
}
