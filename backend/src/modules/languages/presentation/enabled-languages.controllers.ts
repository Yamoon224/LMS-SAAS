import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public, RequirePermissions } from "@shared/decorators";

import { ListEnabledLanguagesUseCase } from "../application/languages.use-cases";

/** Langues actuellement proposées aux apprenants (sélecteur de langue du profil). */
@ApiTags("Plateforme publique / Langues")
@Controller("public/languages")
export class PublicLanguagesController {
  constructor(private readonly listEnabledLanguagesUseCase: ListEnabledLanguagesUseCase) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Langues activées (code, nom, sens d'écriture)" })
  list() {
    return this.listEnabledLanguagesUseCase.execute();
  }
}

/** Langues cibles proposées à l'entreprise pour la traduction IA de ses formations. */
@ApiTags("Entreprise / Langues")
@Controller("business/languages")
export class BusinessLanguagesController {
  constructor(private readonly listEnabledLanguagesUseCase: ListEnabledLanguagesUseCase) {}

  @Get()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Langues activées, pour choisir la langue cible d'une traduction IA" })
  list() {
    return this.listEnabledLanguagesUseCase.execute();
  }
}
