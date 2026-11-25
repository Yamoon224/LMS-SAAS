import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { ListLanguagesUseCase, SetLanguageEnabledUseCase } from "../application/languages.use-cases";

import { SetLanguageEnabledDto } from "./dto/set-language-enabled.dto";

/** ADM-40 : activation et désactivation des langues de la plateforme. */
@ApiTags("Admin / Langues")
@Controller("admin/languages")
export class AdminLanguagesController {
  constructor(
    private readonly listLanguagesUseCase: ListLanguagesUseCase,
    private readonly setLanguageEnabledUseCase: SetLanguageEnabledUseCase,
  ) {}

  @Get()
  @RequirePermissions("languages.manage")
  @ApiOperation({ summary: "Les huit langues et leur état (le français est verrouillé)" })
  list() {
    return this.listLanguagesUseCase.execute();
  }

  @Put(":code")
  @RequirePermissions("languages.manage")
  @ApiOperation({ summary: "Activer ou désactiver une langue (interface et traduction IA)" })
  async setEnabled(@Param("code") code: string, @Body() dto: SetLanguageEnabledDto) {
    await this.setLanguageEnabledUseCase.execute(code, dto.enabled);
    return { code, enabled: dto.enabled };
  }
}
