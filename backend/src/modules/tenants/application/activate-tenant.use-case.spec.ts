import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { TenantStatus } from "../domain/tenant-status";
import { Tenant } from "../domain/tenant.entity";
import type { TenantRepositoryPort } from "../domain/tenant.repository.port";

import { ActivateTenantUseCase } from "./activate-tenant.use-case";

function tenant(status: TenantStatus): Tenant {
  return Tenant.fromPersistence({
    id: "t-1",
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

function build(found: Tenant | null) {
  const repository = {
    findById: jest.fn().mockResolvedValue(found),
    updateStatus: jest.fn(),
  } as unknown as TenantRepositoryPort;
  return { repository, useCase: new ActivateTenantUseCase(repository) };
}

describe("ActivateTenantUseCase", () => {
  it.each([TenantStatus.DRAFT, TenantStatus.SUSPENDED])("active une entreprise au statut %s", async (status) => {
    const { repository, useCase } = build(tenant(status));
    await useCase.execute("t-1");
    expect(repository.updateStatus).toHaveBeenCalledWith("t-1", TenantStatus.ACTIVE);
  });

  it("refuse une entreprise archivée (TRANSITION_INVALIDE)", async () => {
    const { repository, useCase } = build(tenant(TenantStatus.ARCHIVED));
    await expect(useCase.execute("t-1")).rejects.toThrow(InvalidStateTransitionError);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("404 si l'entreprise est inconnue", async () => {
    const { useCase } = build(null);
    await expect(useCase.execute("ghost")).rejects.toThrow(NotFoundDomainError);
  });
});
