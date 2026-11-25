import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { middleware } from "./middleware";

const BASE = "votredomaine.local";
const originalBase = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;

function request(path: string, host: string, cookies: Record<string, string> = {}, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { host, ...extra };
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`http://${host}${path}`, { headers });
}

/** Valeur du header injecté vers l'app (préfixe x-middleware-request-). */
function forwardedSlug(response: Response): string | null {
  return response.headers.get("x-middleware-request-x-tenant-slug");
}

describe("middleware business : résolution du tenant", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN = BASE;
  });
  afterEach(() => {
    if (originalBase === undefined) delete process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;
    else process.env.NEXT_PUBLIC_APP_BASE_DOMAIN = originalBase;
  });

  it("extrait le slug de {slug}-backoffice.{base} (port ignoré)", () => {
    const response = middleware(request("/login", `acme-backoffice.${BASE}:3003`));
    expect(forwardedSlug(response)).toBe("acme");
  });

  it("conserve les tirets du slug (mon-ecole-backoffice)", () => {
    const response = middleware(request("/login", `mon-ecole-backoffice.${BASE}`));
    expect(forwardedSlug(response)).toBe("mon-ecole");
  });

  it("ne résout aucun tenant pour {slug} sans suffixe, admin, api ou le domaine nu", () => {
    for (const host of [`acme.${BASE}`, `admin.${BASE}`, `api.${BASE}`, BASE, "localhost:3003"]) {
      expect(forwardedSlug(middleware(request("/login", host)))).toBeNull();
    }
  });

  it("ne résout aucun tenant pour un slug vide (-backoffice.base)", () => {
    expect(forwardedSlug(middleware(request("/login", `-backoffice.${BASE}`)))).toBeNull();
  });

  it("préfère x-forwarded-host au host", () => {
    const response = middleware(
      request("/login", "localhost:3003", {}, { "x-forwarded-host": `beta-backoffice.${BASE}` }),
    );
    expect(forwardedSlug(response)).toBe("beta");
  });

  it("n'accorde aucune confiance à un x-tenant-slug fourni par le client", () => {
    const response = middleware(request("/login", `acme.${BASE}`, {}, { "x-tenant-slug": "victime" }));
    expect(forwardedSlug(response)).toBeNull();
    const spoofed = middleware(request("/login", `acme-backoffice.${BASE}`, {}, { "x-tenant-slug": "victime" }));
    expect(forwardedSlug(spoofed)).toBe("acme");
  });
});

describe("middleware business : protection des routes", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN = BASE;
  });

  const host = `acme-backoffice.${BASE}`;

  it("redirige vers /login?from= sans cookie de session", () => {
    const response = middleware(request("/courses", host));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("from")).toBe("/courses");
  });

  it("laisse passer les pages publiques d'authentification", () => {
    for (const path of ["/login", "/activate", "/forgot-password", "/reset-password"]) {
      expect(middleware(request(path, host)).status).toBe(200);
    }
  });

  it("laisse passer /api/auth/* et ne redirige pas les appels /api/*", () => {
    expect(middleware(request("/api/auth/login", host)).status).toBe(200);
    expect(middleware(request("/api/backend/courses", host)).status).toBe(200);
  });

  it("accepte le cookie d'accès ou de rafraîchissement", () => {
    expect(middleware(request("/", host, { business_access_token: "a" })).status).toBe(200);
    expect(middleware(request("/", host, { business_refresh_token: "r" })).status).toBe(200);
  });

  it("ignore les cookies d'un autre front (admin_access_token)", () => {
    expect(middleware(request("/", host, { admin_access_token: "x" })).status).toBe(307);
  });
});
