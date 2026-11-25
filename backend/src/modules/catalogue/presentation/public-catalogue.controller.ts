import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, Public } from "@shared/decorators";
import { TenantNotResolvedError } from "@shared/errors";

import { GetPublicCourseUseCase } from "../application/get-public-course.use-case";
import { ListPublicCatalogueUseCase } from "../application/list-public-catalogue.use-case";
import { parseCatalogueQuery } from "../domain/catalogue-query";

/**
 * Le catalogue est propre à une entreprise : sans tenant résolu (Host `api.`/`admin.`), un filtre `tenantId`
 * indéfini listerait les formations de TOUTES les entreprises — on refuse.
 */
function requireTenant(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new TenantNotResolvedError("Le catalogue nécessite une entreprise: utilisez le sous-domaine de l'entreprise.");
  }
  return tenantId;
}

/** PUB-02/PUB-03 : catalogue public et fiche formation — formations publiées uniquement. */
@ApiTags("Plateforme publique / Catalogue")
@Controller("public/courses")
export class PublicCatalogueController {
  constructor(
    private readonly listPublicCatalogueUseCase: ListPublicCatalogueUseCase,
    private readonly getPublicCourseUseCase: GetPublicCourseUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({
    summary:
      "Catalogue des formations publiées (PUB-02) : filtres category, language, level, price (free|paid), minPrice, maxPrice, q ; tri sort ; pagination page/pageSize",
  })
  async catalogue(@CurrentTenant() tenantId: string, @Query() rawQuery: Record<string, unknown>) {
    const query = parseCatalogueQuery(rawQuery);
    return this.listPublicCatalogueUseCase.execute(requireTenant(tenantId), query);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Fiche formation publique (PUB-03) : programme (titres), formateurs, langues, sessions live" })
  async findOne(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.getPublicCourseUseCase.execute(id, requireTenant(tenantId));
  }
}
