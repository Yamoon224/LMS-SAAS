import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { TenantStatus } from "../domain/tenant-status";
import { Tenant } from "../domain/tenant.entity";
import { TenantSuspendedEvent } from "../tenants.events";

import { SuspendTenantUseCase } from "./suspend-tenant.use-case";

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
  const useCase = new SuspendTenantUseCase(repository as never, events as never);
  return { useCase, repository, events };
}

describe("SuspendTenantUseCase", () => {
  it("suspend une entreprise active avec le motif et émet l'événement", async () => {
    const { useCase, repository, events } = setup(tenantWith(TenantStatus.ACTIVE));
    await useCase.execute("t1", "Non-paiement");
    expect(repository.updateStatus).toHaveBeenCalledWith("t1", TenantStatus.SUSPENDED, "Non-paiement");
    expect(events.emit).toHaveBeenCalledWith("tenant.suspended", expect.any(TenantSuspendedEvent));
    expect(events.emit.mock.calls[0][1]).toMatchObject({ tenantId: "t1" });
  });

  it.each([TenantStatus.DRAFT, TenantStatus.SUSPENDED, TenantStatus.ARCHIVED])(
    "refuse de suspendre une entreprise %s",
    async (status) => {
      const { useCase, repository, events } = setup(tenantWith(status));
      await expect(useCase.execute("t1", "x")).rejects.toBeInstanceOf(InvalidStateTransitionError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    },
  );

  it("lève une 404 si l'entreprise n'existe pas", async () => {
    const { useCase, repository } = setup(null);
    await expect(useCase.execute("nope", "x")).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });
});
