import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { SUPERVISION_REPOSITORY } from "../domain/supervision.repository.port";
import type { SupervisionRepositoryPort } from "../domain/supervision.repository.port";

import { SupervisionQueryDto } from "./dto/supervision-query.dto";

/**
 * ADM-29 à ADM-32 : supervision globale en lecture seule. Les listes contiennent les 500 lignes les plus récentes,
 * filtrables par entreprise ; la recherche et le tri se font côté écran.
 */
@ApiTags("Admin / Supervision")
@Controller("admin/supervision")
export class AdminSupervisionController {
  constructor(@Inject(SUPERVISION_REPOSITORY) private readonly repository: SupervisionRepositoryPort) {}

  @Get("courses")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Formations de toutes les entreprises (ADM-29)" })
  courses(@Query() query: SupervisionQueryDto) {
    return this.repository.listCourses({ tenantId: query.tenantId });
  }

  @Get("learners")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Apprenants de toutes les entreprises (ADM-30)" })
  learners(@Query() query: SupervisionQueryDto) {
    return this.repository.listLearners({ tenantId: query.tenantId });
  }

  @Get("certificates")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Registre global des certificats (ADM-31)" })
  certificates(@Query() query: SupervisionQueryDto) {
    return this.repository.listCertificates({ tenantId: query.tenantId });
  }

  @Get("transactions")
  @RequirePermissions("wallet.view-all")
  @ApiOperation({ summary: "Tous les paiements : abonnements, crédits IA, ventes de formations (ADM-32)" })
  transactions(@Query() query: SupervisionQueryDto) {
    return this.repository.listTransactions({ tenantId: query.tenantId });
  }
}
