import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { TenantStatus } from "../domain/tenant-status";
import { Tenant } from "../domain/tenant.entity";

import { ArchiveTenantUseCase } from "./archive-tenant.use-case";

function tenantWith(status: TenantStatus): Tenant {
  return Tenant.fromPersistence({
    id: "t1",
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

function setup(tenant: Tenant | null) {
  const repository = {
    findById: jest.fn().mockResolvedValue(tenant),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
  const events = { emit: jest.fn() };
  const useCase = new ArchiveTenantUseCase(repository as never, events as never);
  return { useCase, repository, events };
}

describe("ArchiveTenantUseCase", () => {
  it.each([TenantStatus.ACTIVE, TenantStatus.SUSPENDED])("archive une entreprise %s et émet l'événement", async (status) => {
    const { useCase, repository, events } = setup(tenantWith(status));
    await useCase.execute("t1", "admin-1");
    expect(repository.updateStatus).toHaveBeenCalledWith("t1", TenantStatus.ARCHIVED);
    expect(events.emit).toHaveBeenCalledWith("tenant.archived", expect.objectContaining({ tenantId: "t1", actorId: "admin-1" }));
  });

  it.each([TenantStatus.DRAFT, TenantStatus.ARCHIVED])("refuse d'archiver une entreprise %s", async (status) => {
    const { useCase, repository, events } = setup(tenantWith(status));
    await expect(useCase.execute("t1", "admin-1")).rejects.toBeInstanceOf(InvalidStateTransitionError);
    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("lève une erreur 404 si l'entreprise n'existe pas", async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute("nope", null)).rejects.toBeInstanceOf(NotFoundDomainError);
  });
});
