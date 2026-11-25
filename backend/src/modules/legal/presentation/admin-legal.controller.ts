import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import {
  CreateLegalDraftUseCase,
  ListLegalDocumentsUseCase,
  PublishLegalDocumentUseCase,
  UpdateLegalDraftUseCase,
} from "../application/legal.use-cases";

import { CreateLegalDraftDto, UpdateLegalDraftDto } from "./dto/legal-document.dto";

/** ADM-41 : pages légales de la plateforme, versionnées. Une version publiée n'est plus modifiable. */
@ApiTags("Admin / Pages légales")
@Controller("admin/legal")
export class AdminLegalController {
  constructor(
    private readonly listLegalDocumentsUseCase: ListLegalDocumentsUseCase,
    private readonly createLegalDraftUseCase: CreateLegalDraftUseCase,
    private readonly updateLegalDraftUseCase: UpdateLegalDraftUseCase,
    private readonly publishLegalDocumentUseCase: PublishLegalDocumentUseCase,
  ) {}

  @Get()
  @RequirePermissions("legal.manage")
  @ApiOperation({ summary: "Toutes les versions des CGU, CGV et de la politique de confidentialité" })
  list() {
    return this.listLegalDocumentsUseCase.execute();
  }

  @Post()
  @RequirePermissions("legal.manage")
  @ApiOperation({ summary: "Créer une nouvelle version en brouillon" })
  async createDraft(@Body() dto: CreateLegalDraftDto) {
    const document = await this.createLegalDraftUseCase.execute(dto);
    return { id: document.id, type: document.type, version: document.version };
  }

  @Put(":id")
  @RequirePermissions("legal.manage")
  @ApiOperation({ summary: "Modifier un brouillon (refusé pour une version publiée)" })
  async updateDraft(@Param("id") id: string, @Body() dto: UpdateLegalDraftDto) {
    await this.updateLegalDraftUseCase.execute(id, dto);
    return { id };
  }

  @Post(":id/publish")
  @RequirePermissions("legal.manage")
  @ApiOperation({ summary: "Publier un brouillon : il devient la version courante de son type" })
  async publish(@Param("id") id: string) {
    await this.publishLegalDocumentUseCase.execute(id);
    return { id, published: true };
  }
}
