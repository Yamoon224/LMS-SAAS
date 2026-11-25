import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { GetPlatformHealthUseCase } from "../application/get-platform-health.use-case";

/** ADM-35 : santé technique — files de tâches, taux d'erreur des webhooks, espace de stockage global. */
@ApiTags("Admin / Santé technique")
@Controller("admin/health")
export class AdminHealthController {
  constructor(private readonly getPlatformHealthUseCase: GetPlatformHealthUseCase) {}

  @Get()
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "État des files, taux d'erreur des webhooks (24 h) et stockage global" })
  health() {
    return this.getPlatformHealthUseCase.execute();
  }
}
