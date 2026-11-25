import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LOCALE_COOKIE } from "@/lib/i18n/locales";

import { middleware } from "./middleware";

const BASE = "votredomaine.local";
const env = process.env as Record<string, string | undefined>;
const saved = { base: env.NEXT_PUBLIC_APP_BASE_DOMAIN, dev: env.LEARNING_DEV_TENANT_SLUG };

function request(path: string, host: string, cookies: Record<string, string> = {}, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { host, ...extra };
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`http://${host}${path}`, { headers });
}

const forwardedSlug = (response: Response) => response.headers.get("x-middleware-request-x-tenant-slug");

describe("middleware learning : résolution du tenant", () => {
  beforeEach(() => {
    env.NEXT_PUBLIC_APP_BASE_DOMAIN = BASE;
    delete env.LEARNING_DEV_TENANT_SLUG;
  });
  afterEach(() => {
    for (const [key, value] of [
      ["NEXT_PUBLIC_APP_BASE_DOMAIN", saved.base],
      ["LEARNING_DEV_TENANT_SLUG", saved.dev],
    ] as const) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  });

  it("résout {slug}.{base}, port ignoré", () => {
    expect(forwardedSlug(middleware(request("/", `demo.${BASE}:3004`)))).toBe("demo");
    expect(forwardedSlug(middleware(request("/", `mon-ecole.${BASE}`)))).toBe("mon-ecole");
  });

  it("ne résout rien pour admin, api, *-backoffice ni le domaine nu", () => {
    for (const host of [`admin.${BASE}`, `api.${BASE}`, `demo-backoffice.${BASE}`, BASE]) {
      expect(forwardedSlug(middleware(request("/", host)))).toBeNull();
    }
  });

  it("utilise x-forwarded-host en priorité", () => {
    const response = middleware(request("/", "localhost:3004", {}, { "x-forwarded-host": `beta.${BASE}` }));
    expect(forwardedSlug(response)).toBe("beta");
  });

  it("n'accepte pas un x-tenant-slug imposé par le client", () => {
    const response = middleware(request("/", `admin.${BASE}`, {}, { "x-tenant-slug": "victime" }));
    expect(forwardedSlug(response)).toBeNull();
    expect(forwardedSlug(middleware(request("/", `demo.${BASE}`, {}, { "x-tenant-slug": "victime" })))).toBe("demo");
  });

  it("hors domaine de base : slug de dev uniquement hors production", () => {
    env.LEARNING_DEV_TENANT_SLUG = "demo";
    expect(forwardedSlug(middleware(request("/", "localhost:3004")))).toBe("demo");
    delete env.LEARNING_DEV_TENANT_SLUG;
    expect(forwardedSlug(middleware(request("/", "localhost:3004")))).toBeNull();
  });
});

describe("middleware learning : routes protégées et langue", () => {
  beforeEach(() => {
    env.NEXT_PUBLIC_APP_BASE_DOMAIN = BASE;
  });
  const host = `demo.${BASE}`;

  it("redirige les pages apprenant vers /login?from= sans session", () => {
    for (const path of ["/my-learning", "/certificates", "/notifications", "/purchases", "/profile/edit"]) {
      const response = middleware(request(path, host));
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location") ?? "");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("from")).toBe(path);
    }
  });

  it("laisse publics le catalogue, la connexion et /verify", () => {
    for (const path of ["/", "/login", "/register", "/courses", "/verify/abc", "/my-learning-guide"]) {
      expect(middleware(request(path, host)).status).toBe(200);
    }
  });

  it("laisse entrer avec un cookie d'accès ou de rafraîchissement", () => {
    expect(middleware(request("/my-learning", host, { learning_access_token: "a" })).status).toBe(200);
    expect(middleware(request("/my-learning", host, { learning_refresh_token: "r" })).status).toBe(200);
  });

  it("renvoie un apprenant connecté de /login vers /my-learning", () => {
    const response = middleware(request("/login", host, { learning_access_token: "a" }));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/my-learning");
  });

  it("mémorise ?lang= valide dans un cookie d'un an et ignore une langue inconnue", () => {
    const ok = middleware(request("/?lang=en", host));
    expect(ok.cookies.get(LOCALE_COOKIE)?.value).toBe("en");
    expect(ok.headers.get("x-middleware-request-cookie")).toContain(`${LOCALE_COOKIE}=en`);
    expect(middleware(request("/?lang=xx", host)).cookies.get(LOCALE_COOKIE)).toBeUndefined();
  });
});
