import { Inject, Injectable } from "@nestjs/common";

import {
  assertCanSetEnabled,
  assertEnabled,
  enabledLanguages,
  resolveLanguages,
} from "../domain/language";
import type { Language, LanguageStatus } from "../domain/language";
import { LANGUAGE_REPOSITORY } from "../domain/language.repository.port";
import type { LanguageRepositoryPort } from "../domain/language.repository.port";

/** ADM-40 : toutes les langues avec leur état, pour l'écran Admin. */
@Injectable()
export class ListLanguagesUseCase {
  constructor(@Inject(LANGUAGE_REPOSITORY) private readonly repository: LanguageRepositoryPort) {}

  async execute(): Promise<LanguageStatus[]> {
    return resolveLanguages(new Set(await this.repository.listDisabledCodes()));
  }
}

/** Langues actuellement proposées (interface et traduction IA) : lecture publique. */
@Injectable()
export class ListEnabledLanguagesUseCase {
  constructor(@Inject(LANGUAGE_REPOSITORY) private readonly repository: LanguageRepositoryPort) {}

  async execute(): Promise<Language[]> {
    return enabledLanguages(new Set(await this.repository.listDisabledCodes()));
  }
}

/** ADM-40 : active ou désactive une langue ; le français et les codes inconnus sont refusés. */
@Injectable()
export class SetLanguageEnabledUseCase {
  constructor(@Inject(LANGUAGE_REPOSITORY) private readonly repository: LanguageRepositoryPort) {}

  async execute(code: string, enabled: boolean): Promise<void> {
    assertCanSetEnabled(code, enabled);
    await this.repository.setEnabled(code, enabled);
  }
}

/** Contrôle qu'une langue est utilisable (existe et activée). */
@Injectable()
export class AssertLanguageEnabledUseCase {
  constructor(@Inject(LANGUAGE_REPOSITORY) private readonly repository: LanguageRepositoryPort) {}

  async execute(code: string): Promise<void> {
    assertEnabled(code, new Set(await this.repository.listDisabledCodes()));
  }
}

/** Garde, parmi des codes de langue, ceux qui existent et sont activés sur la plateforme. */
@Injectable()
export class FilterEnabledLanguagesUseCase {
  constructor(@Inject(LANGUAGE_REPOSITORY) private readonly repository: LanguageRepositoryPort) {}

  async execute(codes: readonly string[]): Promise<string[]> {
    const enabled = new Set(enabledLanguages(new Set(await this.repository.listDisabledCodes())).map((l) => l.code));
    return codes.filter((code) => enabled.has(code));
  }
}
