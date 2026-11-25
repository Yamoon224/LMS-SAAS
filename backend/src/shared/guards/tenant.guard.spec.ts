import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { TenantMismatchError, TenantNotResolvedError } from "@shared/errors";

import { resolveRouteArea, TenantGuard } from "./tenant.guard";

interface FakeRequest {
  originalUrl: string;
  requestSurface?: string;
  tenantSlug?: string;
  tenantId?: string;
  user?: { tenantId: string | null };
}

function build(request: FakeRequest, isPublic = false) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(isPublic) } as unknown as Reflector;
  const tenantsFacade = {
    findActiveBySlug: jest.fn().mockResolvedValue({ id: "tenant-A" }),
  } as unknown as TenantsFacade;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return { guard: new TenantGuard(reflector, tenantsFacade), context };
}

describe("resolveRouteArea", () => {
  it("returns the first segment after the global prefix, ignoring the query string", () => {
    expect(resolveRouteArea("/v1/business/courses?x=1", "v1")).toBe("business");
    expect(resolveRouteArea("/v1/admin/users/42", "v1")).toBe("admin");
    expect(resolveRouteArea("/auth/login", "v1")).toBe("auth");
    expect(resolveRouteArea(undefined, "v1")).toBe("");
  });
});

describe("TenantGuard - tenant surfaces (business / learning)", () => {
  const base = { originalUrl: "/v1/business/courses", requestSurface: "business", tenantSlug: "acme" };

  it("accepts a token of the resolved tenant and sets request.tenantId", async () => {
    const request: FakeRequest = { ...base, user: { tenantId: "tenant-A" } };
    const { guard, context } = build(request);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.tenantId).toBe("tenant-A");
  });

  it("rejects a token of another tenant with TENANT_MISMATCH", async () => {
    const { guard, context } = build({ ...base, user: { tenantId: "tenant-B" } });
    await expect(guard.canActivate(context)).rejects.toThrow(TenantMismatchError);
  });

  it("rejects a platform token (tenantId null) on a tenant route", async () => {
    const { guard, context } = build({ ...base, user: { tenantId: null } });
    await expect(guard.canActivate(context)).rejects.toThrow(TenantMismatchError);
  });

  it("rejects admin routes served from a tenant host", async () => {
    const { guard, context } = build({ ...base, originalUrl: "/v1/admin/users", user: { tenantId: "tenant-A" } });
    await expect(guard.canActivate(context)).rejects.toThrow(TenantMismatchError);
  });

  it("lets anonymous public routes through with the tenant resolved", async () => {
    const request: FakeRequest = { ...base, originalUrl: "/v1/public/courses", requestSurface: "learning" };
    const { guard, context } = build(request, true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.tenantId).toBe("tenant-A");
  });

  it("rejects a tenant route without slug unless public", async () => {
    const { guard, context } = build({ originalUrl: "/v1/business/courses", requestSurface: "unknown" });
    await expect(guard.canActivate(context)).rejects.toThrow(TenantNotResolvedError);
    const publicCase = build({ originalUrl: "/v1/business/plans", requestSurface: "unknown" }, true);
    await expect(publicCase.guard.canActivate(publicCase.context)).resolves.toBe(true);
  });
});

describe("TenantGuard - admin / api surfaces (no tenant resolved)", () => {
  it("refuses authenticated business/public routes (would run without any tenant filter)", async () => {
    for (const surface of ["admin", "api"]) {
      for (const url of ["/v1/business/courses", "/v1/public/enrollments/my"]) {
        const { guard, context } = build({ originalUrl: url, requestSurface: surface, user: { tenantId: "tenant-A" } });
        await expect(guard.canActivate(context)).rejects.toThrow(TenantNotResolvedError);
      }
    }
  });

  it("refuses a tenant-bound token on admin routes", async () => {
    const { guard, context } = build({
      originalUrl: "/v1/admin/tenants",
      requestSurface: "admin",
      user: { tenantId: "tenant-A" },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(TenantMismatchError);
  });

  it("accepts a platform token on admin routes", async () => {
    const { guard, context } = build({
      originalUrl: "/v1/admin/tenants",
      requestSurface: "admin",
      user: { tenantId: null },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("keeps auth and @Public routes reachable on the api host", async () => {
    const login = build({ originalUrl: "/v1/auth/login", requestSurface: "api" }, true);
    await expect(login.guard.canActivate(login.context)).resolves.toBe(true);
    const plans = build({ originalUrl: "/v1/business/plans", requestSurface: "api" }, true);
    await expect(plans.guard.canActivate(plans.context)).resolves.toBe(true);
  });
});
