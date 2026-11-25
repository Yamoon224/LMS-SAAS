import { Inject, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

import { PASSWORD_HASH_READER } from "../domain/password-hash-reader.port";
import type { PasswordHashReaderPort } from "../domain/password-hash-reader.port";

/**
 * Ré-authentification pour une action sensible (ex. changement des coordonnées de reversement, ENT-11) :
 * vérifie le mot de passe actuel d'un utilisateur sans émettre de jeton. Retourne `false` (jamais d'exception)
 * si l'utilisateur est inconnu, sans mot de passe, ou si le mot de passe est faux.
 */
@Injectable()
export class VerifyUserPasswordUseCase {
  constructor(@Inject(PASSWORD_HASH_READER) private readonly passwordHashReader: PasswordHashReaderPort) {}

  async execute(userId: string, password: string): Promise<boolean> {
    if (!password) return false;
    const hash = await this.passwordHashReader.getPasswordHash(userId);
    if (!hash) return false;
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
