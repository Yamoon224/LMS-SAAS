import * as argon2 from "argon2";

import type { UserRepositoryPort } from "../domain/user.repository.port";

import { CreateActiveUserUseCase } from "./create-active-user.use-case";
import { EmailAlreadyUsedError } from "./invite-user.use-case";

// argon2 (64 Mo / calcul) est lent sur une machine chargée : marge sur le délai par défaut de 5 s.
jest.setTimeout(120_000);

const input = {
  tenantId: "t1",
  type: "COMPANY_USER" as never,
  email: "Owner@Acme.com",
  firstName: "Aya",
  lastName: "Koné",
  locale: "fr",
  roleIds: ["r1"],
  password: "S3cret-pass!",
};

describe("CreateActiveUserUseCase", () => {
  it("crée le compte avec un hash argon2 (jamais le mot de passe en clair)", async () => {
    const create = jest.fn().mockResolvedValue({ id: "u1" });
    const repo = {
      existsByEmailInTenant: jest.fn().mockResolvedValue(false),
      create,
    } as unknown as UserRepositoryPort;
    await new CreateActiveUserUseCase(repo).execute(input);
    const data = create.mock.calls[0][0];
    expect(data.passwordHash).not.toBe(input.password);
    expect(await argon2.verify(data.passwordHash, input.password)).toBe(true);
    expect(data.email).toBe("owner@acme.com");
    expect(JSON.stringify(data)).not.toContain(input.password);
  });

  it("refuse un e-mail déjà utilisé", async () => {
    const repo = {
      existsByEmailInTenant: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
    } as unknown as UserRepositoryPort;
    await expect(new CreateActiveUserUseCase(repo).execute(input)).rejects.toBeInstanceOf(EmailAlreadyUsedError);
  });
});
