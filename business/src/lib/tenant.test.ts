import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const headerStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerStore.get(name) ?? null }),
}));

import { BACKOFFICE_SUFFIX, buildBackendHostHeader, getAppBaseDomain, getResolvedTenantSlug } from "./tenant";

const original = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;

describe("tenant (business)", () => {
  beforeEach(() => {
    headerStore.clear();
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN = "votredomaine.local";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;
    else process.env.NEXT_PUBLIC_APP_BASE_DOMAIN = original;
  });

  it("reconstruit le Host attendu par le backend", () => {
    expect(buildBackendHostHeader("acme")).toBe(`acme${BACKOFFICE_SUFFIX}.votredomaine.local`);
    expect(getAppBaseDomain()).toBe("votredomaine.local");
  });

  it("lit le slug posé par le middleware, sinon undefined", async () => {
    expect(await getResolvedTenantSlug()).toBeUndefined();
    headerStore.set("x-tenant-slug", "acme");
    expect(await getResolvedTenantSlug()).toBe("acme");
  });
});
