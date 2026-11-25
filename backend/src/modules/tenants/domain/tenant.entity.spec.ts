import { InvalidStateTransitionError } from "@shared/errors";

import { TenantStatus } from "./tenant-status";
import { Tenant } from "./tenant.entity";

function buildTenant(status: TenantStatus): Tenant {
  return Tenant.fromPersistence({
    id: "tenant-1",
    name: "Acme",
    slug: "acme",
    status,
    statusReason: null,
    country: "CI",
    currency: "XOF",
    defaultLocale: "fr",
    createdAt: new Date(),
  });
}

describe("Tenant entity - accessors", () => {
  it("expose ses propriétés avec des valeurs par défaut hors plateforme", () => {
    const tenant = buildTenant(TenantStatus.ACTIVE);
    expect(tenant.id).toBe("tenant-1");
    expect(tenant.name).toBe("Acme");
    expect(tenant.slug).toBe("acme");
    expect(tenant.statusReason).toBeNull();
    expect(tenant.country).toBe("CI");
    expect(tenant.currency).toBe("XOF");
    expect(tenant.defaultLocale).toBe("fr");
    expect(tenant.createdAt).toBeInstanceOf(Date);
    expect(tenant.offlinePaymentEnabled).toBe(false);
    expect(tenant.offlinePaymentInstructions).toBeNull();
    expect(tenant.publicBranding).toEqual({ logoUrl: null, primaryColor: null, bannerUrl: null, description: null });
  });

  it("reflète le paiement hors plateforme et la charte renseignés", () => {
    const tenant = Tenant.fromPersistence({
      id: "t",
      name: "A",
      slug: "a",
      status: TenantStatus.ACTIVE,
      statusReason: null,
      country: "CI",
      currency: "XOF",
      defaultLocale: "fr",
      branding: { logoUrl: "https://cdn.x/l.png", primaryColor: "#112233" },
      offlinePaymentEnabled: true,
      offlinePaymentInstructions: "Virement",
      createdAt: new Date(),
    });
    expect(tenant.offlinePaymentEnabled).toBe(true);
    expect(tenant.offlinePaymentInstructions).toBe("Virement");
    expect(tenant.publicBranding.logoUrl).toBe("https://cdn.x/l.png");
    expect(tenant.publicBranding.primaryColor).toBe("#112233");
  });

  it("conserve le motif de suspension et refuse la réactivation d'une entreprise archivée", () => {
    const tenant = buildTenant(TenantStatus.ACTIVE);
    tenant.suspend("CGU");
    expect(tenant.statusReason).toBe("CGU");
    expect(tenant.status).toBe(TenantStatus.SUSPENDED);
    expect(tenant.archive().status).toBe(TenantStatus.ARCHIVED);
    expect(() => tenant.reactivate()).toThrow(InvalidStateTransitionError);
  });
});

describe("Tenant entity", () => {
  it("is operational only when active (RG-01)", () => {
    expect(buildTenant(TenantStatus.ACTIVE).isOperational()).toBe(true);
    expect(buildTenant(TenantStatus.SUSPENDED).isOperational()).toBe(false);
    expect(buildTenant(TenantStatus.DRAFT).isOperational()).toBe(false);
    expect(buildTenant(TenantStatus.ARCHIVED).isOperational()).toBe(false);
  });

  it("allows suspending an active tenant with a reason", () => {
    const tenant = buildTenant(TenantStatus.ACTIVE);
    const result = tenant.suspend("Non-respect des CGU");
    expect(result.status).toBe(TenantStatus.SUSPENDED);
    expect(result.statusReason).toBe("Non-respect des CGU");
  });

  it("rejects suspending an already archived tenant", () => {
    const tenant = buildTenant(TenantStatus.ARCHIVED);
    expect(() => tenant.suspend("motif")).toThrow(InvalidStateTransitionError);
  });

  it("allows reactivating a suspended tenant", () => {
    const tenant = buildTenant(TenantStatus.SUSPENDED);
    expect(tenant.reactivate().status).toBe(TenantStatus.ACTIVE);
  });

  it("rejects archiving a draft tenant directly", () => {
    const tenant = buildTenant(TenantStatus.DRAFT);
    expect(() => tenant.archive()).toThrow(InvalidStateTransitionError);
  });
});
