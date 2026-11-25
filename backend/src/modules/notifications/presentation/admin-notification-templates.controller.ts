import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import {
  ListNotificationTemplatesUseCase,
  ResetNotificationTemplateUseCase,
  SaveNotificationTemplateUseCase,
} from "../application/manage-notification-templates.use-cases";

import { SaveNotificationTemplateDto } from "./dto/notification-template.dto";

/** ADM-38 : modèles d'e-mails multilingues, modifiables par l'Admin avec des variables `{{variable}}`. */
@ApiTags("Admin / Modèles d'e-mails")
@Controller("admin/notification-templates")
export class AdminNotificationTemplatesController {
  constructor(
    private readonly listNotificationTemplatesUseCase: ListNotificationTemplatesUseCase,
    private readonly saveNotificationTemplateUseCase: SaveNotificationTemplateUseCase,
    private readonly resetNotificationTemplateUseCase: ResetNotificationTemplateUseCase,
  ) {}

  @Get()
  @RequirePermissions("notification-templates.manage")
  @ApiOperation({ summary: "Tous les modèles (texte d'origine, texte actuel, variables disponibles)" })
  list() {
    return this.listNotificationTemplatesUseCase.execute();
  }

  @Put(":templateKey/:locale")
  @RequirePermissions("notification-templates.manage")
  @ApiOperation({ summary: "Remplacer le sujet et le contenu d'un modèle pour une langue" })
  async save(
    @Param("templateKey") templateKey: string,
    @Param("locale") locale: string,
    @Body() dto: SaveNotificationTemplateDto,
  ) {
    await this.saveNotificationTemplateUseCase.execute(templateKey, locale, dto.subject, dto.body);
    return { templateKey, locale };
  }

  @Delete(":templateKey/:locale")
  @RequirePermissions("notification-templates.manage")
  @ApiOperation({ summary: "Revenir au texte d'origine" })
  async reset(@Param("templateKey") templateKey: string, @Param("locale") locale: string) {
    await this.resetNotificationTemplateUseCase.execute(templateKey, locale);
    return { templateKey, locale, reset: true };
  }
}
