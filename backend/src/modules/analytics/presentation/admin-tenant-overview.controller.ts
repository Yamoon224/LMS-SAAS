import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { GetTenantOverviewUseCase } from "../application/get-tenant-overview.use-case";

/**
 * ADM-10 : fiche 360° d'une entreprise, lecture seule. Chaque onglet a sa propre permission : les finances exigent
 * `wallet.view-all` et le journal `audit.view`, comme leurs pages dédiées.
 */
@ApiTags("Admin / Entreprises")
@Controller("admin/tenants/:id")
export class AdminTenantOverviewController {
  constructor(private readonly getTenantOverviewUseCase: GetTenantOverviewUseCase) {}

  @Get("overview")
  @RequirePermissions("tenants.read")
  @ApiOperation({ summary: "Aperçu 360° : profil, contacts, abonnement, usage vs quotas (ADM-10)" })
  overview(@Param("id") id: string) {
    return this.getTenantOverviewUseCase.overview(id);
  }

  @Get("invitations")
  @RequirePermissions("tenants.read")
  @ApiOperation({ summary: "Invitation envoyée au(x) propriétaire(s) à la création : état du lien et e-mail (jeton masqué)" })
  invitations(@Param("id") id: string) {
    return this.getTenantOverviewUseCase.invitations(id);
  }

  @Get("users")
  @RequirePermissions("tenants.read")
  @ApiOperation({ summary: "Comptes internes de l'entreprise : rôles et statuts (ADM-10)" })
  users(@Param("id") id: string) {
    return this.getTenantOverviewUseCase.users(id);
  }

  @Get("finances")
  @RequirePermissions("wallet.view-all")
  @ApiOperation({ summary: "Paiements, reversements et remboursements récents de l'entreprise (ADM-10)" })
  finances(@Param("id") id: string) {
    return this.getTenantOverviewUseCase.finances(id);
  }

  @Get("audit")
  @RequirePermissions("audit.view")
  @ApiOperation({ summary: "Journal d'audit de l'entreprise (ADM-10)" })
  audit(@Param("id") id: string) {
    return this.getTenantOverviewUseCase.audit(id);
  }
}
