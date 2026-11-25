import { Body, Controller, Delete, Get, Param, Post, Put, StreamableFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import {
  ManageCertificateLibraryUseCase,
  PreviewCertificateDesignUseCase,
} from "../application/certificate-library.use-cases";

import { PreviewDesignDto, SaveLibraryTemplateDto } from "./dto/certificate-library.dto";

/** ADM-39 : bibliothèque de modèles de certificats proposés aux entreprises. */
@ApiTags("Admin / Modèles de certificats")
@Controller("admin/certificate-library")
export class AdminCertificateLibraryController {
  constructor(
    private readonly manageUseCase: ManageCertificateLibraryUseCase,
    private readonly previewUseCase: PreviewCertificateDesignUseCase,
  ) {}

  @Get()
  @RequirePermissions("certificate-library.manage")
  @ApiOperation({ summary: "Tous les modèles de la bibliothèque, avec avertissements de lisibilité" })
  list() {
    return this.manageUseCase.list();
  }

  @Post()
  @RequirePermissions("certificate-library.manage")
  @ApiOperation({ summary: "Créer un modèle (brouillon, à prévisualiser puis publier)" })
  async create(@Body() dto: SaveLibraryTemplateDto) {
    const template = await this.manageUseCase.create(dto);
    return { id: template.id, name: template.name, isPublished: template.isPublished };
  }

  /** Déclaré avant `:id` : « preview » n'est pas un identifiant. */
  @Post("preview")
  @RequirePermissions("certificate-library.manage")
  @ApiOperation({ summary: "Aperçu PDF d'un design (données fictives), sans rien enregistrer" })
  async preview(@Body() dto: PreviewDesignDto) {
    const pdf = await this.previewUseCase.ofDesign(dto.design);
    return new StreamableFile(pdf, { type: "application/pdf", disposition: 'inline; filename="apercu-certificat.pdf"' });
  }

  @Put(":id")
  @RequirePermissions("certificate-library.manage")
  @ApiOperation({ summary: "Modifier un modèle (sans effet sur les copies déjà installées)" })
  async update(@Param("id") id: string, @Body() dto: SaveLibraryTemplateDto) {
    await this.manageUseCase.update(id, dto);
    return { id };
  }

  @Post(":id/publish")
  @RequirePermissions("certificate-library.manage")
  @ApiOperation({ summary: "Publier : le modèle devient visible des entreprises" })
  async publish(@Param("id") id: string) {
    await this.manageUseCase.setPublished(id, true);
    return { id, isPublished: true };
  }

  @Post(":id/unpublish")
  @RequirePermissions("certificate-library.manage")
  @ApiOperation({ summary: "Retirer de la bibliothèque (les copies déjà installées restent)" })
  async unpublish(@Param("id") id: string) {
    await this.manageUseCase.setPublished(id, false);
    return { id, isPublished: false };
  }

  @Delete(":id")
  @RequirePermissions("certificate-library.manage")
  @ApiOperation({ summary: "Supprimer un modèle (les copies déjà installées restent)" })
  async remove(@Param("id") id: string) {
    await this.manageUseCase.delete(id);
    return { id, deleted: true };
  }
}
