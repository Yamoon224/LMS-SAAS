import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { GetAiConsumptionUseCase } from "../application/get-ai-consumption.use-case";

import { DateRangeDto } from "./dto/date-range.dto";

/** ADM-34 : consommation IA — tâches de traduction par entreprise, crédits consommés, coût estimé et marge. */
@ApiTags("Admin / Consommation IA")
@Controller("admin/analytics")
export class AdminAiConsumptionController {
  constructor(private readonly getAiConsumptionUseCase: GetAiConsumptionUseCase) {}

  @Get("ai-consumption")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Consommation IA par entreprise sur une période (défaut : mois courant)" })
  async aiConsumption(@Query() query: DateRangeDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const now = new Date();
    const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    return this.getAiConsumptionUseCase.execute({ from, to });
  }
}
