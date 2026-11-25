import { Body, Controller, Get, Param, Post, StreamableFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import {
  PreviewCertificateDesignUseCase,
  UseCertificateLibraryTemplateUseCase,
} from "../application/certificate-library.use-cases";

import { InstallLibraryTemplateDto } from "./dto/certificate-library.dto";

/** ENT-38 / ADM-39 : modèles de certificats proposés par la plateforme. */
@ApiTags("Entreprise / Modèles de certificats")
@Controller("business/certificate-library")
export class BusinessCertificateLibraryController {
  constructor(
    private readonly useTemplateUseCase: UseCertificateLibraryTemplateUseCase,
    private readonly previewUseCase: PreviewCertificateDesignUseCase,
  ) {}

  @Get()
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Modèles publiés de la bibliothèque" })
  list() {
    return this.useTemplateUseCase.listPublished();
  }

  @Get(":id/preview")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Aperçu PDF d'un modèle publié (données fictives)" })
  async preview(@Param("id") id: string) {
    const pdf = await this.previewUseCase.ofPublishedTemplate(id);
    return new StreamableFile(pdf, { type: "application/pdf", disposition: 'inline; filename="apercu-certificat.pdf"' });
  }

  @Post(":id/install")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Utiliser ce modèle : crée une copie dans les modèles de l'entreprise" })
  async install(
    @CurrentTenant() tenantId: string,
    @Param("id") id: string,
    @Body() dto: InstallLibraryTemplateDto,
  ) {
    const template = await this.useTemplateUseCase.install(tenantId, id, dto.makeDefault ?? false);
    return { id: template.id, name: template.name, isDefault: template.isDefault };
  }
}
