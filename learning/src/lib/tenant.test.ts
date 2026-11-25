import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const headerStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerStore.get(name) ?? null }),
}));

import { buildBackendHostHeader, getResolvedTenantSlug, tenantDisplayName, tenantHeaders } from "./tenant";

const original = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;

describe("tenant (learning)", () => {
  beforeEach(() => {
    headerStore.clear();
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN = "votredomaine.local";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;
    else process.env.NEXT_PUBLIC_APP_BASE_DOMAIN = original;
  });

  it("construit le host apprenant sans suffixe -backoffice", () => {
    expect(buildBackendHostHeader("demo")).toBe("demo.votredomaine.local");
  });

  it("transmet le tenant via X-Forwarded-Host, et rien sans tenant", () => {
    expect(tenantHeaders("demo")).toEqual({ "X-Forwarded-Host": "demo.votredomaine.local" });
    expect(tenantHeaders(undefined)).toEqual({});
  });

  it("lit le slug du header interne", async () => {
    expect(await getResolvedTenantSlug()).toBeUndefined();
    headerStore.set("x-tenant-slug", "demo");
    expect(await getResolvedTenantSlug()).toBe("demo");
  });

  it("dérive un nom d'affichage provisoire du slug", () => {
    expect(tenantDisplayName("mon-ecole")).toBe("Mon Ecole");
    expect(tenantDisplayName("demo")).toBe("Demo");
    expect(tenantDisplayName(undefined)).toBe("Formations");
  });
});
