import { NotFoundDomainError } from "@shared/errors";

import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { GetOwnProfileUseCase } from "./get-own-profile.use-case";

const learner = User.fromPersistence({
  id: "user-1",
  tenantId: "tenant-1",
  type: "LEARNER",
  email: "awa@example.com",
  firstName: "Awa",
  lastName: "Kone",
  phone: "+2250700000000",
  locale: "fr",
  status: UserStatus.ACTIVE,
  roleIds: ["role-secret"],
  createdAt: new Date(),
});

describe("GetOwnProfileUseCase", () => {
  it("renvoie uniquement les champs de profil, sans rôles ni statut", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(learner) } as unknown as UserRepositoryPort;
    const profile = await new GetOwnProfileUseCase(repository).execute("user-1");
    expect(profile).toEqual({
      id: "user-1",
      email: "awa@example.com",
      firstName: "Awa",
      lastName: "Kone",
      phone: "+2250700000000",
      locale: "fr",
    });
    expect(repository.findById).toHaveBeenCalledWith("user-1");
  });

  it("lève une erreur pour un utilisateur introuvable", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null) } as unknown as UserRepositoryPort;
    await expect(new GetOwnProfileUseCase(repository).execute("inconnu")).rejects.toThrow(NotFoundDomainError);
  });
});
