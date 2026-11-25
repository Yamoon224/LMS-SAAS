import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, Public } from "@shared/decorators";
import { NotFoundDomainError, TenantNotResolvedError } from "@shared/errors";

import { TenantsFacade } from "../tenants.facade";

/** Charte publique de l'entreprise courante (nom, logo, couleur) pour l'habillage de l'espace apprenant. */
@ApiTags("Plateforme publique / Entreprise")
@Controller("public/tenant")
export class PublicTenantController {
  constructor(private readonly tenantsFacade: TenantsFacade) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Nom, slug et charte graphique de l'entreprise courante" })
  async getCurrent(@CurrentTenant() tenantId: string | undefined) {
    if (!tenantId) {
      throw new TenantNotResolvedError("Cette route nécessite une entreprise: utilisez le sous-domaine de l'entreprise.");
    }
    const profile = await this.tenantsFacade.getPublicProfile(tenantId);
    if (!profile) throw new NotFoundDomainError("Entreprise introuvable.");
    return profile;
  }
}
