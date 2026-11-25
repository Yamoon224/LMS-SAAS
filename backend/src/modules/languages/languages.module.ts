import { Module } from "@nestjs/common";

import {
  AssertLanguageEnabledUseCase,
  FilterEnabledLanguagesUseCase,
  ListEnabledLanguagesUseCase,
  ListLanguagesUseCase,
  SetLanguageEnabledUseCase,
} from "./application/languages.use-cases";
import { LANGUAGE_REPOSITORY } from "./domain/language.repository.port";
import { LanguagePrismaRepository } from "./infrastructure/language.prisma-repository";
import { LanguagesFacade } from "./languages.facade";
import { AdminLanguagesController } from "./presentation/admin-languages.controller";
import { BusinessLanguagesController } from "./presentation/business-languages.controller";
import { PublicLanguagesController } from "./presentation/public-languages.controller";

/** Langues de la plateforme : interface et traduction IA, activables une à une (ADM-40). */
@Module({
  controllers: [AdminLanguagesController, BusinessLanguagesController, PublicLanguagesController],
  providers: [
    ListLanguagesUseCase,
    ListEnabledLanguagesUseCase,
    SetLanguageEnabledUseCase,
    AssertLanguageEnabledUseCase,
    FilterEnabledLanguagesUseCase,
    LanguagesFacade,
    { provide: LANGUAGE_REPOSITORY, useClass: LanguagePrismaRepository },
  ],
  exports: [LanguagesFacade],
})
export class LanguagesModule {}
