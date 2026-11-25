import { Injectable } from "@nestjs/common";

import { AssertLanguageEnabledUseCase, FilterEnabledLanguagesUseCase } from "./application/languages.use-cases";

/**
 * Seule API publique du module languages. Les autres modules (traduction IA, profils) l'utilisent pour refuser une
 * langue inconnue ou désactivée plutôt que de dupliquer la liste des langues.
 */
@Injectable()
export class LanguagesFacade {
  constructor(
    private readonly assertLanguageEnabledUseCase: AssertLanguageEnabledUseCase,
    private readonly filterEnabledLanguagesUseCase: FilterEnabledLanguagesUseCase,
  ) {}

  /** Lève LANGUE_INCONNUE ou LANGUE_NON_ACTIVEE ; ne renvoie rien si la langue est utilisable. */
  async assertEnabled(code: string): Promise<void> {
    await this.assertLanguageEnabledUseCase.execute(code);
  }

  /** Garde, parmi ces codes, ceux qui existent et sont activés (l'ordre est conservé). */
  async filterEnabled(codes: readonly string[]): Promise<string[]> {
    return this.filterEnabledLanguagesUseCase.execute(codes);
  }
}
