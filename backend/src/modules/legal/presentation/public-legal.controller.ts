import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Public, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  AcceptLegalDocumentUseCase,
  GetCurrentLegalDocumentUseCase,
  ListPendingLegalDocumentsUseCase,
} from "../application/legal.use-cases";

import { AcceptLegalDocumentDto } from "./dto/legal-document.dto";

/** ADM-41 : lecture publique de la version courante et acceptation tracée par l'apprenant connecté. */
@ApiTags("Plateforme publique / Pages légales")
@Controller("public/legal")
export class PublicLegalController {
  constructor(
    private readonly getCurrentLegalDocumentUseCase: GetCurrentLegalDocumentUseCase,
    private readonly acceptLegalDocumentUseCase: AcceptLegalDocumentUseCase,
    private readonly listPendingLegalDocumentsUseCase: ListPendingLegalDocumentsUseCase,
  ) {}

  /** Déclaré avant `:type` : sinon « pending » serait lu comme un type de document. */
  @Get("pending")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Documents obligatoires dont la version courante n'est pas encore acceptée" })
  async pending(@CurrentUser() user: AuthenticatedUser) {
    const documents = await this.listPendingLegalDocumentsUseCase.execute(user.userId);
    return documents.map((document) => ({
      type: document.type,
      version: document.version,
      title: document.title,
    }));
  }

  @Public()
  @Get(":type")
  @ApiOperation({ summary: "Version courante des CGU, CGV ou de la politique de confidentialité" })
  async current(@Param("type") type: string) {
    const document = await this.getCurrentLegalDocumentUseCase.execute(type);
    return {
      type: document.type,
      version: document.version,
      title: document.title,
      content: document.content,
      publishedAt: document.publishedAt,
    };
  }

  @Post(":type/accept")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Accepter une version précise du document (trace horodatée ; refusée si elle n'est plus la courante)" })
  async accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param("type") type: string,
    @Body() dto: AcceptLegalDocumentDto,
  ) {
    return this.acceptLegalDocumentUseCase.execute(user.userId, type, dto.version);
  }
}
