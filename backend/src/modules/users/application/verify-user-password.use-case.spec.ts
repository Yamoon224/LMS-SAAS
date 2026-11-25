import * as argon2 from "argon2";

import type { PasswordHashReaderPort } from "../domain/password-hash-reader.port";

import { VerifyUserPasswordUseCase } from "./verify-user-password.use-case";

// argon2 (64 Mo / calcul) est lent sur une machine chargée : marge sur le délai par défaut de 5 s.
jest.setTimeout(120_000);

describe("VerifyUserPasswordUseCase", () => {
  let useCase: VerifyUserPasswordUseCase;

  beforeAll(async () => {
    const hash = await argon2.hash("Secret#123");
    const reader: PasswordHashReaderPort = {
      getPasswordHash: async (id) => (id === "u1" ? hash : id === "corrompu" ? "pas-un-hash" : null),
    };
    useCase = new VerifyUserPasswordUseCase(reader);
  });

  it("accepte le bon mot de passe", async () => {
    await expect(useCase.execute("u1", "Secret#123")).resolves.toBe(true);
  });

  it("refuse un mauvais mot de passe, un mot de passe vide, un utilisateur inconnu ou un hash corrompu", async () => {
    await expect(useCase.execute("u1", "autre")).resolves.toBe(false);
    await expect(useCase.execute("u1", "")).resolves.toBe(false);
    await expect(useCase.execute("inconnu", "Secret#123")).resolves.toBe(false);
    await expect(useCase.execute("corrompu", "Secret#123")).resolves.toBe(false);
  });
});
