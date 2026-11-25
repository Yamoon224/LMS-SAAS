import type { UsersFacade } from "@modules/users/users.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";

import type { TenantRepositoryPort } from "../domain/tenant.repository.port";

import { CreateTenantUseCase, SlugAlreadyTakenError } from "./create-tenant.use-case";

function build() {
  const tenantRepository = {
    existsBySlug: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue({ id: "t1", slug: "acme" }),
  };
  const usersFacade = { setUpTenantOwner: jest.fn().mockResolvedValue({}) };
  const eventEmitter = { emit: jest.fn() };
  const useCase = new CreateTenantUseCase(
    tenantRepository as unknown as TenantRepositoryPort,
    usersFacade as unknown as UsersFacade,
    eventEmitter as unknown as EventEmitter2,
  );
  return { useCase, tenantRepository, usersFacade, eventEmitter };
}

const base = { name: "Acme", slug: "acme", country: "CI", currency: "XOF", defaultLocale: "fr" };
const owner = { email: "o@acme.com", firstName: "Aya", lastName: "Koné" };

describe("CreateTenantUseCase", () => {
  it("sans mot de passe : propriétaire sans mot de passe (invitation)", async () => {
    const { useCase, usersFacade } = build();
    await useCase.execute({ ...base, owner });
    expect(usersFacade.setUpTenantOwner).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", email: "o@acme.com", password: undefined }),
    );
  });

  it("avec mot de passe : le transmet sans le divulguer dans l'événement", async () => {
    const { useCase, usersFacade, eventEmitter } = build();
    await useCase.execute({ ...base, owner: { ...owner, password: "S3cret-pass!" } });
    expect(usersFacade.setUpTenantOwner).toHaveBeenCalledWith(
      expect.objectContaining({ password: "S3cret-pass!" }),
    );
    expect(JSON.stringify(eventEmitter.emit.mock.calls)).not.toContain("S3cret-pass!");
  });

  it("traite une chaîne vide comme absence de mot de passe", async () => {
    const { useCase, usersFacade } = build();
    await useCase.execute({ ...base, owner: { ...owner, password: "" } });
    expect(usersFacade.setUpTenantOwner).toHaveBeenCalledWith(
      expect.objectContaining({ password: undefined }),
    );
  });

  it("refuse un slug déjà pris", async () => {
    const { useCase, tenantRepository } = build();
    tenantRepository.existsBySlug.mockResolvedValue(true);
    await expect(useCase.execute({ ...base, owner })).rejects.toBeInstanceOf(SlugAlreadyTakenError);
  });
});
